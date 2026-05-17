import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { count, desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { WORKFLOW_STATUSES } from '$lib/domain/workflow/types';

const PER_PAGE = 30;

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const statusFilter = url.searchParams.get('status') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

	const where =
		statusFilter && statusFilter !== 'all'
			? eq(schema.workflows.status, statusFilter as (typeof WORKFLOW_STATUSES)[number])
			: undefined;

	const [countResult, workflows, categories] = await Promise.all([
		db.select({ count: count() }).from(schema.workflows).where(where),
		db.query.workflows.findMany({
			where,
			orderBy: [desc(schema.workflows.created_at)],
			limit: PER_PAGE,
			offset: (page - 1) * PER_PAGE,
			with: { requester: true, category: true }
		}),
		db.select().from(schema.workflow_categories)
	]);

	return {
		workflows,
		categories,
		total: countResult[0]?.count ?? 0,
		page,
		totalPages: Math.ceil((countResult[0]?.count ?? 0) / PER_PAGE),
		statusFilter
	};
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		if (!title) return fail(400, { error: 'Title is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [workflow] = await db
			.insert(schema.workflows)
			.values({
				title,
				description: data.get('description')?.toString().trim() || null,
				priority: (data.get('priority')?.toString() || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
				requester_id: locals.user!.id
			})
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'workflow',
			resource_id: workflow.id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
