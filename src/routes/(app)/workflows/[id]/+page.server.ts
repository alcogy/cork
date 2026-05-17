import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, count, desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const [workflow, allAccounts, files] = await Promise.all([
		db.query.workflows.findFirst({
			where: eq(schema.workflows.id, params.id),
			with: {
				requester: true,
				current_approver: true,
				category: true,
				approvals: {
					orderBy: [asc(schema.workflow_approvals.step_order)],
					with: { approver: true }
				},
				comments: {
					orderBy: [desc(schema.workflow_comments.created_at)],
					with: { account: true }
				}
			}
		}),
		db.select({ id: schema.accounts.id, name: schema.accounts.name })
			.from(schema.accounts)
			.orderBy(asc(schema.accounts.name)),
		db.select().from(schema.workflow_files)
			.where(eq(schema.workflow_files.workflow_id, params.id))
	]);

	if (!workflow) throw error(404, 'Approval request not found');

	const isRequester = workflow.requester_id === locals.user!.id;
	const isAdmin = locals.user!.role === 'admin';
	const canApprove =
		(workflow.status === 'submitted' || workflow.status === 'in_review') &&
		workflow.approvals.some(
			(a) => a.approver_id === locals.user!.id && a.status === 'pending'
		);

	return { workflow, allAccounts, files, isRequester, isAdmin, canApprove };
};

export const actions = {
	addApprover: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const approver_id = data.get('approver_id')?.toString();
		if (!approver_id) return fail(400, { error: 'Approver is required' });

		const db = drizzle(platform!.env.DB, { schema });

		const [maxStep] = await db
			.select({ max: count() })
			.from(schema.workflow_approvals)
			.where(eq(schema.workflow_approvals.workflow_id, params.id));

		const step_order = (maxStep?.max ?? 0) + 1;

		await db.insert(schema.workflow_approvals).values({
			workflow_id: params.id,
			approver_id,
			step_order,
			status: 'pending'
		});

		// Set current_approver_id to first approver if not set
		const wf = await db.query.workflows.findFirst({ where: eq(schema.workflows.id, params.id) });
		if (wf && !wf.current_approver_id) {
			await db.update(schema.workflows)
				.set({ current_approver_id: approver_id })
				.where(eq(schema.workflows.id, params.id));
		}

		return { success: true };
	},

	removeApprover: async ({ request, platform, params }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.workflow_approvals).where(eq(schema.workflow_approvals.id, id));
		return { success: true };
	},

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
		const wf = await db.query.workflows.findFirst({
			where: eq(schema.workflows.id, params.id),
			with: { approvals: true }
		});
		if (!wf) return fail(404, { error: 'Not found' });
		if (wf.approvals.length === 0) return fail(400, { error: 'Add at least one approver before submitting' });

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

		// Update approver's step status
		await db.update(schema.workflow_approvals)
			.set({ status: 'approved', comment, approved_at: now })
			.where(
				eq(schema.workflow_approvals.workflow_id, params.id)
			);

		// Check if all approvers approved
		const remaining = await db.select({ count: count() })
			.from(schema.workflow_approvals)
			.where(eq(schema.workflow_approvals.workflow_id, params.id));

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

	uploadFile: async ({ request, platform, params, locals }) => {
		const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
		const ALLOWED_TYPES = [
			'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
			'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'text/plain', 'text/csv'
		];

		const data = await request.formData();
		const file = data.get('file') as File | null;

		if (!file || file.size === 0) return fail(400, { error: 'No file selected' });
		if (file.size > MAX_SIZE) return fail(400, { error: 'File exceeds 10 MB limit' });
		if (!ALLOWED_TYPES.includes(file.type)) return fail(400, { error: 'File type not allowed' });

		const ext = file.name.split('.').pop() ?? '';
		const r2_key = `workflows/${params.id}/${crypto.randomUUID()}.${ext}`;

		await platform!.env.STORAGE.put(r2_key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type }
		});

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.workflow_files).values({
			workflow_id: params.id,
			uploader_id: locals.user!.id,
			filename: file.name,
			size: file.size,
			content_type: file.type,
			r2_key
		});

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'create', resource_type: 'workflow_file', resource_id: params.id });
		return { success: true };
	},

	deleteFile: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		const [file] = await db.select().from(schema.workflow_files).where(eq(schema.workflow_files.id, id));
		if (!file) return fail(404, { error: 'File not found' });

		await platform!.env.STORAGE.delete(file.r2_key);
		await db.delete(schema.workflow_files).where(eq(schema.workflow_files.id, id));

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'delete', resource_type: 'workflow_file', resource_id: id });
		return { success: true };
	},

	reject: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const comment = data.get('comment')?.toString().trim() || null;

		const db = drizzle(platform!.env.DB, { schema });
		const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

		await db.update(schema.workflow_approvals)
			.set({ status: 'rejected', comment, approved_at: now })
			.where(eq(schema.workflow_approvals.workflow_id, params.id));

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
