import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ShellPage } from '../pages/shell.page';
import { ADMIN, DEALER, TECHNICIAN } from '../fixtures/test-users';

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to login from protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page loads with correct fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('shows error on invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const errorText = await loginPage.loginExpectError('wrong@user.com', 'wrongpassword');
    expect(errorText.length).toBeGreaterThan(0);
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('ADMIN can log in and see dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(ADMIN);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('DEALER can log in and reach dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(DEALER);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('TECHNICIAN can log in and reach dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(TECHNICIAN);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('logged-in user cannot navigate back to login — is redirected away', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(ADMIN);
    await page.goto('/login');
    // Should redirect away since already authenticated
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('ADMIN can log out and is redirected to login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(ADMIN);
    const shell = new ShellPage(page);
    await shell.logout();
    await expect(page).toHaveURL(/\/login/);
  });

  test('after logout, protected routes redirect to login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(ADMIN);
    const shell = new ShellPage(page);
    await shell.logout();
    await page.goto('/job-cards');
    await expect(page).toHaveURL(/\/login/);
  });
});
