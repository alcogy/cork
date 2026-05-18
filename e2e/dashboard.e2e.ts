import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('renders 7 stat cards', async ({ page }) => {
		const statCards = page.locator('.stat-card');
		await expect(statCards).toHaveCount(7);
	});

	test('displays the content grid with cards', async ({ page }) => {
		await expect(page.locator('.content-grid')).toBeVisible();
	});

	test('shows Upcoming/Past schedule toggle', async ({ page }) => {
		const upcomingBtn = page.getByRole('button', { name: /upcoming/i });
		const pastBtn = page.getByRole('button', { name: /past/i });
		await expect(upcomingBtn).toBeVisible();
		await expect(pastBtn).toBeVisible();
	});

	test('toggles schedule view between Upcoming and Past', async ({ page }) => {
		const pastBtn = page.getByRole('button', { name: /past/i });
		await pastBtn.click();
		await expect(pastBtn).toHaveClass(/active/);

		const upcomingBtn = page.getByRole('button', { name: /upcoming/i });
		await upcomingBtn.click();
		await expect(upcomingBtn).toHaveClass(/active/);
	});

	test('sidebar navigation links are present', async ({ page }) => {
		await expect(page.getByRole('link', { name: /customers/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /projects/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /approvals/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /apps/i })).toBeVisible();
	});
});
