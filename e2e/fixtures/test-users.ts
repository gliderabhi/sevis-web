export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'DEALER' | 'TECHNICIAN';
}

export const ADMIN: TestUser = {
  email: process.env['ADMIN_EMAIL'] ?? 'admin@sevis.com',
  password: process.env['ADMIN_PASSWORD'] ?? 'admin123',
  role: 'ADMIN',
};

export const DEALER: TestUser = {
  email: process.env['DEALER_EMAIL'] ?? 'dealer@sevis.com',
  password: process.env['DEALER_PASSWORD'] ?? 'dealer123',
  role: 'DEALER',
};

export const TECHNICIAN: TestUser = {
  email: process.env['TECH_EMAIL'] ?? 'tech@sevis.com',
  password: process.env['TECH_PASSWORD'] ?? 'tech123',
  role: 'TECHNICIAN',
};
