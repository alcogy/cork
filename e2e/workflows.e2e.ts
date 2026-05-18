import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Workflows (Approvals)', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/workflows');
	});

	test('shows the workflows list page', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('has a New request button', async ({ page }) => {
		await expect(page.getByRole('button', { name: /new request/i })).toBeVisible();
	});

	test('has a status filter dropdown', async ({ page }) => {
		await expect(page.locator('select.status-select')).toBeVisible();
	});

	test('opens create modal on New request click', async ({ page }) => {
		await page.getByRole('button', { name: /new request/i }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByLabel(/request title/i)).toBeVisible();
	});

	test('creates a workflow request', async ({ page }) => {
		const title = `E2E Request ${Date.now()}`;

		await page.getByRole('button', { name: /new request/i }).click();
		await page.getByLabel(/request title/i).fill(title);
		await page.getByRole('button', { name: /new request/i }).last().click();

		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(page.getByText(title)).toBeVisible();
	});

	test('filters by status', async ({ page }) => {
		const select = page.locator('select.status-select');
		await select.selectOption('draft');
		await page.waitForURL(/status=draft/);
		await expect(page).toHaveURL(/status=draft/);
	});

	test('navigates to workflow detail on click', async ({ page }) => {
		const firstCard = page.locator('.workflow-card').first();
		if ((await firstCard.count()) === 0) {
			test.skip();
			return;
		}
		await firstCard.click();
		await expect(page).toHaveURL(/\/workflows\/.+/);
	});
});

test.describe('Workflow detail', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/workflows');
	});

	test('detail page shows approval steps section', async ({ page }) => {
		const firstCard = page.locator('.workflow-card').first();
		if ((await firstCard.count()) === 0) {
			test.skip();
			return;
		}
		await firstCard.click();
		await expect(page).toHaveURL(/\/workflows\/.+/);
		// Should show approval steps or description
		await expect(page.locator('.section h3').first()).toBeVisible();
	});
});
