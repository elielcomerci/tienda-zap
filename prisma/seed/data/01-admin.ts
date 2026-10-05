import { AdminSeedData } from '../types';

export function getAdminSeedData(): AdminSeedData | null {
  const email = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('[SEED] SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD no están configurados. Omitiendo seed de admin.');
    return null;
  }

  return {
    email,
    password,
    name: 'Admin ZAP',
  };
}
