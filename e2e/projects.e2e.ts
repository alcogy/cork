import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Projects', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/projects');
	});

	test('shows the projects list page', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('has a New project button', async ({ page }) => {
		await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();
	});

	test('has a search bar', async ({ page }) => {
		await expect(page.locator('.search-bar input')).toBeVisible();
	});

	test('opens create modal on New project click', async ({ page }) => {
		await page.getByRole('button', { name: /new project/i }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByLabel(/project name/i)).toBeVisible();
	});

	test('requires project name (HTML5 validation)', async ({ page }) => {
		await page.getByRole('button', { name: /new project/i }).click();
		// Don't fill name - submit should be blocked by HTML5 required
		// Submit button says "New project" (t().project.new)
		const submitBtn = page.locator('dialog button[type="submit"]');
		await submitBtn.click();
		// Dialog should still be open due to required field
		await expect(page.getByRole('dialog')).toBeVisible();
	});

	test('creates a project and shows it in the list', async ({ page }) => {
		const title = `E2E Project ${Date.now()}`;

		await page.getByRole('button', { name: /new project/i }).click();
		await page.getByLabel(/project name/i).fill(title);
		await page.locator('input[name="start_date"]').fill('2025-01-01');
		await page.locator('input[name="end_date"]').fill('2025-12-31');
		// Submit button in projects modal says t().project.new = "New project"
		await page.locator('dialog button[type="submit"]').click();

		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(page.getByText(title)).toBeVisible();
	});
});

test.describe('Project detail', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/projects');
	});

	test('project detail page shows tabs', async ({ page }) => {
		const firstCard = page.locator('.project-card').first();
		if ((await firstCard.count()) === 0) test.skip();
		await firstCard.click();
		await expect(page).toHaveURL(/\/projects\/.+/);

		const tabs = page.locator('.tabs .tab');
		await expect(tabs.first()).toBeVisible();
	});
});
