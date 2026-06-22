import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ShellPage } from '../pages/shell.page';
import { ADMIN, DEALER, TECHNICIAN } from '../fixtures/test-users';

// ─── ADMIN ──────────────────────────────────────────────────────────────────

test.describe('ADMIN role access', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(ADMIN);
  });

  test('ADMIN sees Users nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navUsers).toBeVisible();
  });

  test('ADMIN sees Technicians nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navTechnicians).toBeVisible();
  });

  test('ADMIN can access /users', async ({ page }) => {
    await page.goto('/users');
    await expect(page).not.toHaveURL(/\/unauthorized/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('ADMIN can access /technicians', async ({ page }) => {
    await page.goto('/technicians');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  test('ADMIN can access /parts', async ({ page }) => {
    await page.goto('/parts');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  test('ADMIN can access /inventory', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  test('ADMIN can access /billing', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  test('ADMIN can access /reports', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });
});

// ─── DEALER ─────────────────────────────────────────────────────────────────

test.describe('DEALER role access', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(DEALER);
  });

  test('DEALER does NOT see Users nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navUsers).not.toBeVisible();
  });

  test('DEALER sees Technicians nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navTechnicians).toBeVisible();
  });

  test('DEALER is redirected from /users to /unauthorized', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('DEALER can access /technicians', async ({ page }) => {
    await page.goto('/technicians');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  test('DEALER can access /parts', async ({ page }) => {
    await page.goto('/parts');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });

  test('DEALER sees New Job Card button on job cards list', async ({ page }) => {
    await page.goto('/job-cards');
    await expect(page.getByRole('button', { name: 'New Job Card' })).toBeVisible();
  });
});

// ─── TECHNICIAN ─────────────────────────────────────────────────────────────

test.describe('TECHNICIAN role access', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(TECHNICIAN);
  });

  test('TECHNICIAN does NOT see Users nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navUsers).not.toBeVisible();
  });

  test('TECHNICIAN does NOT see Technicians nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navTechnicians).not.toBeVisible();
  });

  test('TECHNICIAN does NOT see Parts Catalogue nav link', async ({ page }) => {
    const shell = new ShellPage(page);
    await expect(shell.navParts).not.toBeVisible();
  });

  test('TECHNICIAN is redirected from /users to /unauthorized', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('TECHNICIAN is redirected from /technicians to /unauthorized', async ({ page }) => {
    await page.goto('/technicians');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('TECHNICIAN is redirected from /parts to /unauthorized', async ({ page }) => {
    await page.goto('/parts');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('TECHNICIAN cannot see New Job Card button on job cards list', async ({ page }) => {
    await page.goto('/job-cards');
    await expect(page.getByRole('button', { name: 'New Job Card' })).not.toBeVisible();
  });

  test('TECHNICIAN can access /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/unauthorized/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('TECHNICIAN can access /job-cards', async ({ page }) => {
    await page.goto('/job-cards');
    await expect(page).not.toHaveURL(/\/unauthorized/);
  });
});
