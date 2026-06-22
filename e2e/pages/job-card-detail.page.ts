import { Page } from '@playwright/test';

export class JobCardDetailPage {
  constructor(private page: Page) {}

  get backButton() {
    return this.page.getByRole('button', { name: 'Back' });
  }

  get statusSelect() {
    // The status dropdown in the status update section
    return this.page.locator('select.jcd-select').first();
  }

  get updateStatusButton() {
    return this.page.locator('button.jcd-update-btn');
  }

  get addLabourButton() {
    return this.page.getByRole('button', { name: 'Add Labour' });
  }

  get addPartButton() {
    return this.page.getByRole('button', { name: 'Add Part' });
  }

  get closedBadge() {
    return this.page.locator('span.jcd-closed-badge');
  }

  get updateError() {
    return this.page.locator('div[style*="dc2626"]').last();
  }

  get jobCardNumber() {
    return this.page.locator('span.jcd-job-number');
  }

  taskStatusButtons() {
    return this.page.locator('button.jcd-task-status-btn');
  }

  taskStatusButtonFor(index: number) {
    return this.taskStatusButtons().nth(index);
  }

  async changeStatus(newStatus: string) {
    await this.statusSelect.selectOption(newStatus);
    await this.updateStatusButton.click();
    // Wait for the status badge to reflect the new status
    await this.page.waitForTimeout(1000);
  }

  async toggleTaskStatus(index = 0) {
    const btn = this.taskStatusButtonFor(index);
    const before = await btn.getAttribute('class');
    await btn.click();
    // Wait for class change indicating status flipped
    await this.page.waitForFunction(
      ({ selector, prevClass }: { selector: string; prevClass: string | null }) => {
        const el = document.querySelectorAll(selector)[0] as HTMLElement | null;
        return el && el.getAttribute('class') !== prevClass;
      },
      { selector: 'button.jcd-task-status-btn', prevClass: before },
      { timeout: 6_000 }
    );
  }

  async getTaskStatusLabel(index = 0): Promise<string> {
    return this.taskStatusButtonFor(index).innerText();
  }

  async isTaskDone(index = 0): Promise<boolean> {
    const cls = await this.taskStatusButtonFor(index).getAttribute('class');
    return cls?.includes('jcd-task-status-btn--done') ?? false;
  }

  async downloadPdf() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByRole('button', { name: 'PDF' }).click(),
    ]);
    return download;
  }
}
