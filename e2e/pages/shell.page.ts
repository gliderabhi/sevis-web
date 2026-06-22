import { Page } from '@playwright/test';

export class ShellPage {
  constructor(private page: Page) {}

  get navDashboard() {
    return this.page.locator('a[routerlink="/dashboard"], a[href="/dashboard"]');
  }

  get navJobCards() {
    return this.page.locator('a[routerlink="/job-cards"], a[href="/job-cards"]');
  }

  get navUsers() {
    return this.page.locator('a[routerlink="/users"], a[href="/users"]');
  }

  get navTechnicians() {
    return this.page.locator('a[routerlink="/technicians"], a[href="/technicians"]');
  }

  get navParts() {
    return this.page.locator('a[routerlink="/parts"], a[href="/parts"]');
  }

  get navInventory() {
    return this.page.locator('a[routerlink="/inventory"], a[href="/inventory"]');
  }

  get navBilling() {
    return this.page.locator('a[routerlink="/billing"], a[href="/billing"]');
  }

  async openAccountMenu() {
    // The account footer button toggles the menu
    const footer = this.page.locator('div[style*="border-top:1px solid rgba(255,255,255,0.08)"]');
    await footer.locator('button').first().click();
  }

  async logout() {
    await this.openAccountMenu();
    await this.page.getByRole('button', { name: 'Logout' }).click();
    await this.page.waitForURL('**/login');
  }
}
