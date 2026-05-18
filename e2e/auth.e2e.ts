import { test, expect } from '@playwright/test';
import { login, logout, ADMIN, USER } from './helpers';

test.describe('Authentication', () => {
	test('shows login page at /login', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
	});

	test('redirects unauthenticated users to /login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});

	test('logs in with valid admin credentials', async ({ page }) => {
		await login(page, ADMIN);
		await expect(page).toHaveURL('/');
		// Sidebar visible after login
		await expect(page.locator('nav')).toBeVisible();
	});

	test('logs in with valid user credentials', async ({ page }) => {
		await login(page, USER);
		await expect(page).toHaveURL('/');
	});

	test('shows error for invalid credentials', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('wrong@example.com');
		await page.getByLabel(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();
		await expect(page.locator('.error, [class*="error"]')).toBeVisible();
		await expect(page).toHaveURL('/login');
	});

	test('logs out and redirects to /login', async ({ page }) => {
		await login(page, ADMIN);
		await logout(page);
		await expect(page).toHaveURL('/login');
	});
});
