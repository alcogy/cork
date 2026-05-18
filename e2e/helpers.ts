import type { Page } from '@playwright/test';

export const ADMIN = { email: 'admin@example.com', password: 'admin123' };
export const USER = { email: 'user@example.com', password: 'user123' };

export async function login(page: Page, credentials = ADMIN) {
	await page.goto('/login');
	await page.getByLabel(/email/i).fill(credentials.email);
	await page.getByLabel(/password/i).fill(credentials.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('/');
}

export async function logout(page: Page) {
	await page.goto('/logout');
}
