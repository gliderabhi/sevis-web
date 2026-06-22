import { Page } from '@playwright/test';

export class JobCardListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/job-cards');
  }

  get newJobCardButton() {
    return this.page.getByRole('button', { name: 'New Job Card' });
  }

  get searchInput() {
    return this.page.locator('input[placeholder*="Search by JC"]');
  }

  get tableRows() {
    return this.page.locator('tbody tr[routerlink], tbody tr[ng-reflect-router-link]');
  }

  get rowCount() {
    return this.page.locator('div[style*="Showing"]');
  }

  get loadingIndicator() {
    return this.page.locator('div', { hasText: 'Loading job cards…' });
  }

  get emptyState() {
    return this.page.locator('td[colspan="7"]', { hasText: 'No job cards found' });
  }

  async waitForLoad() {
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('div');
      return loading && !document.body.innerText.includes('Loading job cards');
    });
  }

  async filterByStatus(label: string) {
    await this.page.getByRole('button', { name: label, exact: true }).click();
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(400);
  }

  async clickFirstRow() {
    const firstRow = this.tableRows.first();
    await firstRow.click();
    await this.page.waitForURL(/\/job-cards\/\d+/);
  }

  async getFirstJobCardNumber(): Promise<string> {
    return this.tableRows.first().locator('span[style*="monospace"]').innerText();
  }
}
