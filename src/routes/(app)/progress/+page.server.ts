import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { count, desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ platform }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const wbsList = await db.query.wbs.findMany({
		orderBy: [desc(schema.wbs.created_at)],
		with: { creator: true, members: { with: { account: true } } }
	});

	return { wbsList };
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const start_date = data.get('start_date')?.toString();
		const end_date = data.get('end_date')?.toString();

		if (!title || !start_date || !end_date) {
			return fail(400, { error: 'Title, start date, and end date are required' });
		}

		const db = drizzle(platform!.env.DB, { schema });
		const [wbsEntry] = await db
			.insert(schema.wbs)
			.values({
				title,
				description: data.get('description')?.toString().trim() || '',
				start_date,
				end_date,
				created_by: locals.user!.id
			})
			.returning();

		await db.insert(schema.wbs_members).values({
			wbs_id: wbsEntry.id,
			account_id: locals.user!.id
		});

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'wbs',
			resource_id: wbsEntry.id,
			request
		});

		return { success: true };
	},

	delete: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.wbs).where(eq(schema.wbs.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'wbs',
			resource_id: id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
