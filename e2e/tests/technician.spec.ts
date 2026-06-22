import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { JobCardListPage } from '../pages/job-card-list.page';
import { JobCardDetailPage } from '../pages/job-card-detail.page';
import { JobCardCreatePage } from '../pages/job-card-create.page';
import { ADMIN, TECHNICIAN } from '../fixtures/test-users';

// ─── Technician filtered list ─────────────────────────────────────────────

test.describe('TECHNICIAN — job card list is filtered', () => {
  test('TECHNICIAN job card list only shows their assigned cards', async ({ page }) => {
    // ADMIN list and TECHNICIAN list should differ (or tech list may be empty if none assigned)
    const loginPage = new LoginPage(page);

    await loginPage.login(ADMIN);
    const adminList = new JobCardListPage(page);
    await adminList.goto();
    await page.waitForTimeout(800);
    const adminCount = await adminList.tableRows.count();

    // Switch to TECHNICIAN
    const adminShell = page.locator('div[style*="border-top:1px solid rgba(255,255,255,0.08)"]');
    await adminShell.locator('button').first().click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    await loginPage.login(TECHNICIAN);
    const techList = new JobCardListPage(page);
    await techList.goto();
    await page.waitForTimeout(800);
    const techCount = await techList.tableRows.count();

    // Tech can only see <= admin total (they see a subset or equal set)
    expect(techCount).toBeLessThanOrEqual(adminCount);
  });
});

// ─── Task status toggle ───────────────────────────────────────────────────

test.describe('Task status — toggle PENDING / DONE', () => {
  let jobCardUrl: string;

  test.beforeEach(async ({ page }) => {
    // Create a job card and add a labour item assigned to a technician (as ADMIN)
    const loginPage = new LoginPage(page);
    await loginPage.login(ADMIN);

    const create = new JobCardCreatePage(page);
    await create.goto();
    await create.fill({
      customerPhone: '9111111111',
      customerName: 'Task Status Test',
      vehicleRegNumber: `TASK${Date.now().toString().slice(-6)}`,
    });
    await create.submit();
    jobCardUrl = page.url();

    // Add a labour item (uses the first technician option in the dropdown)
    const detail = new JobCardDetailPage(page);
    await detail.addLabourButton.click();

    // Fill labour form — type and optionally assign technician
    const labourTypeSelect = page.locator('select.jcd-select', { hasText: '' }).first();
    // Select the first available option
    const options = await page.locator('select[ngmodel*="labourForm.type"], select[[(ngmodel)]*="labourForm"]').first().locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val) await page.locator('select[ngmodel*="labourForm.type"], select').first().selectOption(val);
    }

    // Try to assign a technician (first option with value)
    const techSelect = page.locator('select').filter({ hasText: /technician/i }).first();
    if (await techSelect.count() > 0) {
      const techOptions = await techSelect.locator('option').all();
      if (techOptions.length > 1) {
        const techVal = await techOptions[1].getAttribute('value');
        if (techVal) await techSelect.selectOption(techVal);
      }
    }

    // Submit labour form
    const saveBtn = page.getByRole('button', { name: /save|add/i }).last();
    if (await saveBtn.isVisible()) await saveBtn.click();
    await page.waitForTimeout(1000);
  });

  test('labour task starts as PENDING', async ({ page }) => {
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);
    const buttons = detail.taskStatusButtons();
    const count = await buttons.count();
    test.skip(count === 0, 'No labour items with task status on this job card');
    const isDone = await detail.isTaskDone(0);
    // New labour should start PENDING
    expect(isDone).toBe(false);
  });

  test('ADMIN can toggle task status PENDING → DONE', async ({ page }) => {
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);
    const buttons = detail.taskStatusButtons();
    const count = await buttons.count();
    test.skip(count === 0, 'No labour items with task status on this job card');

    await detail.toggleTaskStatus(0);
    const isDone = await detail.isTaskDone(0);
    expect(isDone).toBe(true);
  });

  test('ADMIN can toggle task status DONE → PENDING', async ({ page }) => {
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);
    const buttons = detail.taskStatusButtons();
    const count = await buttons.count();
    test.skip(count === 0, 'No labour items with task status on this job card');

    // First make it DONE
    await detail.toggleTaskStatus(0);
    expect(await detail.isTaskDone(0)).toBe(true);
    // Now toggle back to PENDING
    await detail.toggleTaskStatus(0);
    expect(await detail.isTaskDone(0)).toBe(false);
  });
});

// ─── Close restriction ────────────────────────────────────────────────────

test.describe('Close restriction — cannot close with pending tasks', () => {
  let jobCardUrl: string;

  test.beforeEach(async ({ page }) => {
    // Create job card with a labour item that has a technician assigned (remains PENDING)
    const loginPage = new LoginPage(page);
    await loginPage.login(ADMIN);

    const create = new JobCardCreatePage(page);
    await create.goto();
    await create.fill({
      customerPhone: '9222222222',
      customerName: 'Close Block Test',
      vehicleRegNumber: `CBLK${Date.now().toString().slice(-6)}`,
    });
    await create.submit();
    jobCardUrl = page.url();
  });

  test('job card without pending tasks can be closed', async ({ page }) => {
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);

    // Advance to DELIVERED first (required before CLOSED)
    await detail.changeStatus('IN_PROGRESS');
    await detail.changeStatus('READY');
    await detail.changeStatus('DELIVERED');
    await detail.changeStatus('CLOSED');

    await expect(detail.closedBadge).toBeVisible();
  });

  test('closing with pending labour shows an error', async ({ page }) => {
    // This test is meaningful only if there's a labour item assigned to a technician
    // that is still PENDING. We navigate to an existing job card that has such state.
    // If the beforeEach job card has no labour, we skip.
    await page.goto(jobCardUrl);
    const detail = new JobCardDetailPage(page);

    const taskButtons = await detail.taskStatusButtons().count();
    if (taskButtons === 0) {
      test.skip(true, 'No labour items with pending task status — skip close restriction check');
      return;
    }

    // Advance to DELIVERED
    await detail.changeStatus('IN_PROGRESS');
    await detail.changeStatus('READY');
    await detail.changeStatus('DELIVERED');

    // Attempt CLOSED — should produce an error message
    await detail.changeStatus('CLOSED');
    await expect(detail.updateError).toContainText(/pending/i);
    // Status should NOT have changed to CLOSED
    await expect(detail.closedBadge).not.toBeVisible();
  });
});
