import { Page } from '@playwright/test';

export interface CreateJobCardInput {
  customerPhone: string;
  customerName: string;
  vehicleRegNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  serviceType?: string;
  kmIn?: string;
  advisorName?: string;
}

export class JobCardCreatePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/job-cards/new');
  }

  async fill(data: CreateJobCardInput) {
    await this.page.locator('input[name="custPhone"]').fill(data.customerPhone);
    await this.page.locator('input[name="custName"]').fill(data.customerName);
    await this.page.locator('input[name="regNumber"]').fill(data.vehicleRegNumber);
    if (data.vehicleMake) await this.page.locator('input[name="make"]').fill(data.vehicleMake);
    if (data.vehicleModel) await this.page.locator('input[name="model"]').fill(data.vehicleModel);
    if (data.kmIn) await this.page.locator('input[name="kmIn"]').fill(data.kmIn);
    if (data.advisorName) await this.page.locator('input[name="advisorName"]').fill(data.advisorName);
    if (data.serviceType) {
      await this.page.locator('select[name="serviceType"]').selectOption(data.serviceType);
    }
  }

  async submit() {
    await this.page.locator('button[type="submit"]').click();
    // After successful creation, the app redirects to the new job card detail page
    await this.page.waitForURL(/\/job-cards\/\d+/, { timeout: 15_000 });
  }

  get errorMessage() {
    return this.page.locator('div[style*="fef2f2"]');
  }
}
