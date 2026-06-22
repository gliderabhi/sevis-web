import { Page } from '@playwright/test';
import type { TestUser } from '../fixtures/test-users';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(user: TestUser) {
    await this.page.goto('/login');
    await this.page.locator('input[type="email"]').fill(user.email);
    await this.page.locator('input[type="password"]').fill(user.password);
    await this.page.locator('button[type="submit"]').click();
    // Wait for redirect away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
  }

  async loginExpectError(email: string, password: string): Promise<string> {
    await this.page.goto('/login');
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.locator('button[type="submit"]').click();
    const errorEl = this.page.locator('div[style*="fef2f2"]');
    await errorEl.waitFor({ timeout: 8_000 });
    return errorEl.innerText();
  }

  get emailInput() {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput() {
    return this.page.locator('input[type="password"]');
  }

  get submitButton() {
    return this.page.locator('button[type="submit"]');
  }
}
