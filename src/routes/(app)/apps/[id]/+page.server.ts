import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import type { AppField } from '$lib/domain/apps/types';

export const load: PageServerLoad = async ({ platform, params }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, params.id) });
	if (!app) throw error(404, 'App not found');

	const fields: AppField[] = JSON.parse(app.fields);
	const records = await db.query.app_records.findMany({
		where: eq(schema.app_records.app_id, params.id),
		orderBy: [desc(schema.app_records.created_at)],
		with: { creator: true }
	});

	return {
		app: { ...app, fieldsParsed: fields },
		records: records.map((r) => ({ ...r, dataParsed: JSON.parse(r.data) as Record<string, unknown> }))
	};
};

export const actions = {
	create: async ({ request, platform, params, locals }) => {
		const formData = await request.formData();
		const db = drizzle(platform!.env.DB, { schema });

		const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, params.id) });
		if (!app) return fail(404, { error: 'App not found' });

		const fields: AppField[] = JSON.parse(app.fields);
		const data: Record<string, unknown> = {};

		for (const field of fields) {
			const val = formData.get(field.id)?.toString() ?? '';
			if (field.required && !val) return fail(400, { error: `${field.label} is required` });
			data[field.id] = val;
		}

		const [record] = await db.insert(schema.app_records).values({
			app_id: params.id,
			data: JSON.stringify(data),
			created_by: locals.user!.id
		}).returning();

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'create', resource_type: 'app_record', resource_id: record.id, request });
		return { success: true };
	},

	delete: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.app_records).where(eq(schema.app_records.id, id));
		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'delete', resource_type: 'app_record', resource_id: id, request });
		return { success: true };
	},

	togglePublish: async ({ platform, params, locals }) => {
		const db = drizzle(platform!.env.DB, { schema });
		const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, params.id) });
		if (!app) return fail(404, { error: 'App not found' });

		await db.update(schema.apps).set({ is_published: !app.is_published }).where(eq(schema.apps.id, params.id));
		return { success: true };
	}
} satisfies Actions;
