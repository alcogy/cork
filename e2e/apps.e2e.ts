import { test, expect } from '@playwright/test';
import { login, ADMIN } from './helpers';

test.describe('No-code Apps', () => {
	test.beforeEach(async ({ page }) => {
		await login(page, ADMIN);
		await page.goto('/apps');
	});

	test('shows the apps list page', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('has a New app button', async ({ page }) => {
		await expect(page.getByRole('button', { name: /new app/i })).toBeVisible();
	});

	test('opens create modal on New app click', async ({ page }) => {
		await page.getByRole('button', { name: /new app/i }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByLabel(/app name/i)).toBeVisible();
	});

	test('creates an app and shows it in the list', async ({ page }) => {
		const name = `E2E App ${Date.now()}`;

		await page.getByRole('button', { name: /new app/i }).click();
		await page.getByLabel(/app name/i).fill(name);
		await page.getByRole('button', { name: /^create$/i }).click();

		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(page.locator('.app-name').filter({ hasText: name })).toBeVisible();
	});

	test('navigates to app detail via Records button', async ({ page }) => {
		const firstRecordsBtn = page.locator('.app-card').first().getByRole('link', { name: /records/i });
		if ((await page.locator('.app-card').count()) === 0) test.skip();
		await firstRecordsBtn.click();
		await expect(page).toHaveURL(/\/apps\/.+/);
	});
});

test.describe('App builder (admin only)', () => {
	test.beforeEach(async ({ page }) => {
		await login(page, ADMIN);
		await page.goto('/apps');
	});

	test('build page accessible from app card (admin)', async ({ page }) => {
		if ((await page.locator('.app-card').count()) === 0) test.skip();
		const firstBuildBtn = page.locator('.app-card').first().getByRole('link', { name: /build/i });
		await firstBuildBtn.click();
		await expect(page).toHaveURL(/\/apps\/.+\/build/);
		await expect(page.locator('.build-shell')).toBeVisible();
	});
});
