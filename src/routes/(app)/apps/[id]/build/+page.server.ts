import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { AppDef, AppField } from '$lib/domain/apps/types';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	if (locals.user?.role !== 'admin') throw redirect(303, `/apps/${params.id}`);

	const db = drizzle(platform!.env.DB, { schema });
	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, params.id) });
	if (!app) throw error(404, 'App not found');

	const fields: AppField[] = JSON.parse(app.fields);
	const appDef: AppDef = {
		id: app.id,
		name: app.name,
		description: app.description,
		fields,
		is_published: app.is_published,
		created_at: app.created_at,
		updated_at: app.updated_at
	};

	return { app: appDef };
};

export const actions = {
	save: async ({ request, platform, params }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const description = data.get('description')?.toString().trim() ?? '';
		const fieldsJson = data.get('fields')?.toString() ?? '[]';

		if (!name) return fail(400, { error: 'App name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.update(schema.apps).set({
			name,
			description,
			fields: fieldsJson,
			updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
		}).where(eq(schema.apps.id, params.id));

		return { success: true };
	},

	delete: async ({ platform, params, locals }) => {
		if (locals.user?.role !== 'admin') throw error(403, 'Forbidden');

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.apps).where(eq(schema.apps.id, params.id));
		throw redirect(303, '/apps');
	}
} satisfies Actions;
