import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Customers', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/customers');
	});

	test('shows the customer list page', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('table')).toBeVisible();
	});

	test('has a search bar', async ({ page }) => {
		// SearchBar renders <input class="input"> inside <form class="search-bar">
		await expect(page.locator('.search-bar input')).toBeVisible();
	});

	test('has a New customer button (admin)', async ({ page }) => {
		await expect(page.getByRole('button', { name: /new customer/i })).toBeVisible();
	});

	test('opens create modal when New customer is clicked', async ({ page }) => {
		await page.getByRole('button', { name: /new customer/i }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByLabel(/company name/i)).toBeVisible();
	});

	test('closes modal on Cancel', async ({ page }) => {
		await page.getByRole('button', { name: /new customer/i }).click();
		await page.getByRole('button', { name: /cancel/i }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});

	test('creates a customer and shows it in the list', async ({ page }) => {
		const name = `E2E Test Corp ${Date.now()}`;

		await page.getByRole('button', { name: /new customer/i }).click();
		await page.getByLabel(/company name/i).fill(name);
		// Submit button says "Create" when creating
		await page.getByRole('button', { name: /^create$/i }).click();

		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(page.getByText(name)).toBeVisible();
	});

	test('searches customers by name', async ({ page }) => {
		const searchInput = page.locator('.search-bar input');
		await searchInput.fill('nonexistent_xyz_123');
		await page.keyboard.press('Enter');
		await page.waitForURL(/search=/);
		// Table should still be visible (empty state or no rows)
		await expect(page.locator('table')).toBeVisible();
	});

	test('navigates to customer detail on row click', async ({ page }) => {
		const firstRow = page.locator('table tbody tr').first();
		if ((await firstRow.count()) === 0) test.skip();
		await firstRow.click();
		await expect(page).toHaveURL(/\/customers\/.+/);
	});
});

test.describe('Customer detail', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/customers');
	});

	test('shows activity/schedule/notes/contacts tabs', async ({ page }) => {
		const firstRow = page.locator('table tbody tr').first();
		if ((await firstRow.count()) === 0) test.skip();
		await firstRow.click();
		await expect(page).toHaveURL(/\/customers\/.+/);

		const tabs = page.locator('.tabs .tab');
		await expect(tabs).toHaveCount(4);
	});
});
