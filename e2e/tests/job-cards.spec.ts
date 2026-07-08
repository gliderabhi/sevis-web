import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { JobCardListPage } from '../pages/job-card-list.page';
import { JobCardDetailPage } from '../pages/job-card-detail.page';
import { JobCardCreatePage } from '../pages/job-card-create.page';
import { ADMIN } from '../fixtures/test-users';

// All job card tests run as ADMIN so we have full access
test.describe('Job Cards — list', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(ADMIN);
  });

  test('job card list loads and shows table', async ({ page }) => {
    const list = new JobCardListPage(page);
    await list.goto();
    // Status filter pills should be present
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RECEIVED' })).toBeVisible();
  });

  test('can filter job cards by status', async ({ page }) => {
    const list = new JobCardListPage(page);
    await list.goto();
    await list.filterByStatus('RECEIVED');
    // Status pills are always shown; filtered count may change
    await expect(list.rowCount).toBeVisible();
  });

  test('can search job cards', async ({ page }) => {
    const list = new JobCardListPage(page);
    await list.goto();
    await list.search('ZZZNOMATCH9999');
    // With no match the empty state or a count of 0 should appear
    const count = await list.tableRows.count();
    expect(count).toBe(0);
  });

  test('clicking a row navigates to job card detail', async ({ page }) => {
    const list = new JobCardListPage(page);
    await list.goto();
    const rowCount = await list.tableRows.count();
    test.skip(rowCount === 0, 'No job cards in database to click');
    await list.clickFirstRow();
    await expect(page).toHaveURL(/\/job-cards\/\d+/);
  });
});

// ─── CREATE ─────────────────────────────────────────────────────────────────

test.describe('Job Cards — create', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(ADMIN);
  });

  test('New Job Card button navigates to create page', async ({ page }) => {
    const list = new JobCardListPage(page);
    await list.goto();
    await list.newJobCardButton.click();
    await expect(page).toHaveURL(/\/job-cards\/new/);
    await expect(page.getByRole('heading', { name: 'New Job Card', level: 2 })).toBeVisible();
  });

  test('create form requires mandatory fields', async ({ page }) => {
    const create = new JobCardCreatePage(page);
    await create.goto();
    // Submit without filling — should stay on the create page (HTML5 validation blocks)
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/job-cards\/new/);
  });

  test('successfully creates a job card and lands on detail page', async ({ page }) => {
    const create = new JobCardCreatePage(page);
    await create.goto();
    await create.fill({
      customerPhone: '9876543210',
      customerName: 'E2E Test Customer',
      vehicleRegNumber: `TEST${Date.now().toString().slice(-6)}`,
      vehicleMake: 'Tata',
      vehicleModel: 'Nexon',
      kmIn: '12000',
      advisorName: 'E2E Advisor',
    });
    await create.submit();
    // Should land on the new job card detail page
    await expect(page).toHaveURL(/\/job-cards\/\d+/);
    const detail = new JobCardDetailPage(page);
    await expect(detail.jobCardNumber).toBeVisible();
  });
});

// ─── DETAIL & STATUS FLOW ───────────────────────────────────────────────────

test.describe('Job Cards — status flow', () => {
  let jobCardUrl: string;

  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(ADMIN);
    // Create a fresh job card for each status-flow test
    const create = new JobCardCreatePage(page);
    await create.goto();
    await create.fill({
      customerPhone: '9000000001',
      customerName: 'Status Flow Test',
      vehicleRegNumber: `FLOW${Date.now().toString().slice(-6)}`,
      vehicleMake: 'Tata',
      vehicleModel: 'Nexon',
    });
    await create.submit();
    jobCardUrl = page.url();
  });

  test('new job card starts in RECEIVED status', async ({ page }) => {
    await page.goto(jobCardUrl);
    // The timeline's first step (Received) should be marked as current/done
    const receivedStep = page.locator('.jcd-timeline-label', { hasText: 'RECEIVED' });
    await expect(receivedStep).toBeVisible();
  });

  test('can advance status from RECEIVED to IN_PROGRESS', async ({ page }) => {
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);
    await detail.changeStatus('IN_PROGRESS');
    // Status badge in header should update
    const badge = page.locator('app-status-badge').first();
    await expect(badge).toContainText(/in.progress/i);
  });

  test('full status flow: RECEIVED → IN_PROGRESS → READY → DELIVERED', async ({ page }) => {
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);

    await detail.changeStatus('IN_PROGRESS');
    await expect(page.locator('app-status-badge').first()).toContainText(/in.progress/i);

    await detail.changeStatus('READY');
    await expect(page.locator('app-status-badge').first()).toContainText(/ready/i);

    await detail.changeStatus('DELIVERED');
    await expect(page.locator('app-status-badge').first()).toContainText(/delivered/i);
  });

  test('CLOSED job card shows read-only badge and disables action buttons', async ({ page }) => {
    // Advance all the way to CLOSED (no pending labour so no block)
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);
    await detail.changeStatus('IN_PROGRESS');
    await detail.changeStatus('READY');
    await detail.changeStatus('DELIVERED');
    await detail.changeStatus('CLOSED');

    await expect(detail.closedBadge).toBeVisible();
    await expect(detail.addLabourButton).toBeDisabled();
    await expect(detail.addPartButton).toBeDisabled();
  });
});
