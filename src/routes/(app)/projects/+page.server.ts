import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, count, desc, eq, like } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';

const PER_PAGE = 30;

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const search = url.searchParams.get('search') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

	const where = search ? like(schema.projects.title, `%${search}%`) : undefined;

	const [countResult, projects, statuses, categories] = await Promise.all([
		db.select({ count: count() }).from(schema.projects).where(where),
		db.query.projects.findMany({
			where,
			orderBy: [asc(schema.projects.display_order), desc(schema.projects.updated_at)],
			limit: PER_PAGE,
			offset: (page - 1) * PER_PAGE,
			with: { status: true, category: true }
		}),
		db.select().from(schema.project_statuses).orderBy(asc(schema.project_statuses.display_order)),
		db.select().from(schema.project_categories).orderBy(asc(schema.project_categories.display_order))
	]);

	return {
		projects,
		statuses,
		categories,
		total: countResult[0]?.count ?? 0,
		page,
		totalPages: Math.ceil((countResult[0]?.count ?? 0) / PER_PAGE),
		search
	};
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		if (!title) return fail(400, { error: 'Project name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [project] = await db
			.insert(schema.projects)
			.values({
				title,
				description: data.get('description')?.toString().trim() || null,
				status_id: data.get('status_id') ? Number(data.get('status_id')) : null,
				category_id: data.get('category_id') ? Number(data.get('category_id')) : null,
				priority: (data.get('priority')?.toString() || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
				start_date: data.get('start_date')?.toString() || null,
				end_date: data.get('end_date')?.toString() || null,
				created_by: locals.user!.id
			})
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'project',
			resource_id: project.id,
			request
		});

		return { success: true };
	},

	delete: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.projects).where(eq(schema.projects.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'project',
			resource_id: id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
