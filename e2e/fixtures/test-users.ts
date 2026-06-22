export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'DEALER' | 'TECHNICIAN';
}

// Dedicated E2E test accounts — safe to use freely, not real data.
// user_id=15 in user_db
export const ADMIN: TestUser = {
  email: process.env['ADMIN_EMAIL'] ?? 'testadmin@sevis.com',
  password: process.env['ADMIN_PASSWORD'] ?? 'TestAdmin@123',
  role: 'ADMIN',
};

// user_id=16 in user_db — Test Auto Works dealer
export const DEALER: TestUser = {
  email: process.env['DEALER_EMAIL'] ?? 'testdealer@sevis.com',
  password: process.env['DEALER_PASSWORD'] ?? 'TestDealer@123',
  role: 'DEALER',
};

// user_id=17 — EMP-TEST-01, assigned to dealer 16
export const TECHNICIAN: TestUser = {
  email: process.env['TECH_EMAIL'] ?? 'testtech1@sevis.com',
  password: process.env['TECH_PASSWORD'] ?? 'TestTech@123',
  role: 'TECHNICIAN',
};

// user_id=18 — EMP-TEST-02, assigned to dealer 16
export const TECHNICIAN2: TestUser = {
  email: process.env['TECH2_EMAIL'] ?? 'testtech2@sevis.com',
  password: process.env['TECH2_PASSWORD'] ?? 'TestTech@123',
  role: 'TECHNICIAN',
};
