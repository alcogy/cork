import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ platform, params }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const [workflow, allAccounts] = await Promise.all([
		db.query.workflows.findFirst({
			where: eq(schema.workflows.id, params.id),
			with: {
				requester: true,
				current_approver: true,
				category: true,
				approvals: { orderBy: [asc(schema.workflow_approvals.step_order)], with: { approver: true } },
				comments: { orderBy: [desc(schema.workflow_comments.created_at)], with: { account: true } }
			}
		}),
		db.select({ id: schema.accounts.id, name: schema.accounts.name }).from(schema.accounts).orderBy(asc(schema.accounts.name))
	]);

	if (!workflow) throw error(404, 'Approval request not found');

	return { workflow, allAccounts };
};

export const actions = {
	addComment: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const content = data.get('content')?.toString().trim();
		if (!content) return fail(400, { error: 'Comment is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.workflow_comments).values({
			workflow_id: params.id,
			account_id: locals.user!.id,
			content
		});
		return { success: true };
	},

	submit: async ({ platform, params, locals }) => {
		const db = drizzle(platform!.env.DB, { schema });
		const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
		await db.update(schema.workflows).set({
			status: 'submitted',
			submitted_at: now,
			updated_at: now
		}).where(eq(schema.workflows.id, params.id));

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'update', resource_type: 'workflow', resource_id: params.id });
		return { success: true };
	},

	approve: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const comment = data.get('comment')?.toString().trim() || null;

		const db = drizzle(platform!.env.DB, { schema });
		const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

		await db.update(schema.workflows).set({
			status: 'approved',
			completed_at: now,
			updated_at: now
		}).where(eq(schema.workflows.id, params.id));

		if (comment) {
			await db.insert(schema.workflow_comments).values({
				workflow_id: params.id,
				account_id: locals.user!.id,
				content: `[Approved] ${comment}`
			});
		}

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'update', resource_type: 'workflow', resource_id: params.id });
		return { success: true };
	},

	reject: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const comment = data.get('comment')?.toString().trim() || null;

		const db = drizzle(platform!.env.DB, { schema });
		const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

		await db.update(schema.workflows).set({
			status: 'rejected',
			completed_at: now,
			updated_at: now
		}).where(eq(schema.workflows.id, params.id));

		if (comment) {
			await db.insert(schema.workflow_comments).values({
				workflow_id: params.id,
				account_id: locals.user!.id,
				content: `[Rejected] ${comment}`
			});
		}

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'update', resource_type: 'workflow', resource_id: params.id });
		return { success: true };
	}
} satisfies Actions;
