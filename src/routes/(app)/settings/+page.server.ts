import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Forbidden');

	const db = drizzle(platform!.env.DB, { schema });

	const [settings, projectStatuses, projectCategories, workflowCategories] = await Promise.all([
		db.select().from(schema.settings),
		db.select().from(schema.project_statuses).orderBy(schema.project_statuses.display_order),
		db.select().from(schema.project_categories).orderBy(schema.project_categories.display_order),
		db.select().from(schema.workflow_categories)
	]);

	const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

	return { settingsMap, projectStatuses, projectCategories, workflowCategories };
};

export const actions = {
	saveSetting: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const key = data.get('key')?.toString();
		const value = data.get('value')?.toString() ?? '';

		if (!key) return fail(400, { error: 'Key is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.settings).values({ key, value })
			.onConflictDoUpdate({ target: schema.settings.key, set: { value } });

		return { success: true };
	},

	addProjectStatus: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const label = data.get('label')?.toString().trim();
		if (!label) return fail(400, { error: 'Label is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_statuses).values({
			label,
			color: data.get('color')?.toString() || '#94a3b8',
			display_order: 999
		});
		return { success: true };
	},

	deleteProjectStatus: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.project_statuses).where(eq(schema.project_statuses.id, id));
		return { success: true };
	},

	addProjectCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const label = data.get('label')?.toString().trim();
		if (!label) return fail(400, { error: 'Label is required' });
		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_categories).values({ label, display_order: 999 });
		return { success: true };
	},

	deleteProjectCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.project_categories).where(eq(schema.project_categories.id, id));
		return { success: true };
	},

	addWorkflowCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const label = data.get('label')?.toString().trim();
		if (!label) return fail(400, { error: 'Label is required' });
		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.workflow_categories).values({
			label,
			color: data.get('color')?.toString() || '#6b7280'
		});
		return { success: true };
	},

	deleteWorkflowCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });
		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.workflow_categories).where(eq(schema.workflow_categories.id, id));
		return { success: true };
	}
} satisfies Actions;
