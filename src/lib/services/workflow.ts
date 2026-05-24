import { z } from 'zod';
import { and, asc, count, desc, eq, max, ne } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { sendWorkflowSubmittedEmails, sendWorkflowApprovedEmail, sendWorkflowRejectedEmail } from './email';
import type { WORKFLOW_STATUSES } from '$lib/types/workflow';
import type { ServiceCtx } from './index';

const PER_PAGE = 30;

const ALLOWED_FILE_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'text/plain',
	'text/csv'
];

const PrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

const CreateWorkflowSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
	description: z.string().max(5000, 'Description too long').nullable().optional(),
	priority: PrioritySchema.optional()
});

const AddCommentSchema = z.object({
	content: z.string().min(1, 'Comment is required').max(5000, 'Comment too long')
});

export async function listWorkflows(
	ctx: ServiceCtx,
	opts: { statusFilter: string; page: number }
) {
	const { db } = ctx;
	const { statusFilter, page } = opts;
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
}

export async function getWorkflow(ctx: ServiceCtx, id: string) {
	const { db, user } = ctx;

	const [workflow, allAccounts, files] = await Promise.all([
		db.query.workflows.findFirst({
			where: eq(schema.workflows.id, id),
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
		db
			.select({ id: schema.accounts.id, name: schema.accounts.name })
			.from(schema.accounts)
			.where(ne(schema.accounts.id, user.id))
			.orderBy(asc(schema.accounts.name)),
		db.select().from(schema.workflow_files).where(eq(schema.workflow_files.workflow_id, id))
	]);

	if (!workflow) throw error(404, 'Approval request not found');

	const isRequester = workflow.requester_id === user.id;
	const isAdmin = user.role === 'admin';
	const canApprove =
		(workflow.status === 'submitted' || workflow.status === 'in_review') &&
		workflow.approvals.some((a) => a.approver_id === user.id && a.status === 'pending');

	return { workflow, allAccounts, files, isRequester, isAdmin, canApprove };
}

export async function createWorkflow(ctx: ServiceCtx, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateWorkflowSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [workflow] = await db
		.insert(schema.workflows)
		.values({ ...r.data, priority: r.data.priority ?? 'normal', requester_id: user.id })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'workflow',
		resource_id: workflow.id,
		metadata: { title: r.data.title },
		request
	});
	return { success: true, id: workflow.id };
}

const UpdateWorkflowSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
	description: z.string().max(5000, 'Description too long').optional(),
	priority: PrioritySchema.optional()
});

export async function updateWorkflow(ctx: ServiceCtx, workflowId: string, data: unknown) {
	const { db, env, user, request } = ctx;

	const wf = await db.query.workflows.findFirst({ where: eq(schema.workflows.id, workflowId) });
	if (!wf) return fail(404, { error: 'Not found' });
	if (wf.status !== 'draft') return fail(400, { error: 'Only draft requests can be edited' });

	const r = UpdateWorkflowSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
	await db
		.update(schema.workflows)
		.set({ title: r.data.title, description: r.data.description ?? null, priority: r.data.priority ?? 'normal', updated_at: now })
		.where(eq(schema.workflows.id, workflowId));

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'workflow',
		resource_id: workflowId,
		request
	});
	return { success: true };
}

export async function addApprover(ctx: ServiceCtx, workflowId: string, approverId: string) {
	const { db } = ctx;
	if (!approverId) return fail(400, { error: 'Approver is required' });

	const [maxStep] = await db
		.select({ max: max(schema.workflow_approvals.step_order) })
		.from(schema.workflow_approvals)
		.where(eq(schema.workflow_approvals.workflow_id, workflowId));

	await db.insert(schema.workflow_approvals).values({
		workflow_id: workflowId,
		approver_id: approverId,
		step_order: (maxStep?.max ?? 0) + 1,
		status: 'pending'
	});

	const wf = await db.query.workflows.findFirst({ where: eq(schema.workflows.id, workflowId) });
	if (wf && !wf.current_approver_id) {
		await db
			.update(schema.workflows)
			.set({ current_approver_id: approverId })
			.where(eq(schema.workflows.id, workflowId));
	}

	return { success: true };
}

export async function removeApprover(ctx: ServiceCtx, approvalId: string) {
	const { db } = ctx;
	if (!approvalId) return fail(400, { error: 'Invalid request' });

	const [target] = await db
		.select({ workflow_id: schema.workflow_approvals.workflow_id })
		.from(schema.workflow_approvals)
		.where(eq(schema.workflow_approvals.id, approvalId));

	await db.delete(schema.workflow_approvals).where(eq(schema.workflow_approvals.id, approvalId));

	if (target?.workflow_id) {
		const remaining = await db
			.select({ id: schema.workflow_approvals.id })
			.from(schema.workflow_approvals)
			.where(eq(schema.workflow_approvals.workflow_id, target.workflow_id))
			.orderBy(asc(schema.workflow_approvals.step_order));

		for (let i = 0; i < remaining.length; i++) {
			await db
				.update(schema.workflow_approvals)
				.set({ step_order: i + 1 })
				.where(eq(schema.workflow_approvals.id, remaining[i].id));
		}
	}

	return { success: true };
}

export async function addComment(ctx: ServiceCtx, workflowId: string, data: unknown) {
	const r = AddCommentSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	await ctx.db.insert(schema.workflow_comments).values({
		workflow_id: workflowId,
		account_id: ctx.user.id,
		content: r.data.content
	});
	return { success: true };
}

export async function submitWorkflow(
	ctx: ServiceCtx,
	workflowId: string,
	updateData?: { title?: string; description?: string; priority?: string }
) {
	const { db, env, user, request } = ctx;
	const wf = await db.query.workflows.findFirst({
		where: eq(schema.workflows.id, workflowId),
		with: { approvals: true }
	});
	if (!wf) return fail(404, { error: 'Not found' });
	if (wf.approvals.length === 0)
		return fail(400, { error: 'Add at least one approver before submitting' });

	if (updateData?.title) {
		const r = UpdateWorkflowSchema.safeParse(updateData);
		if (!r.success) return fail(400, { error: r.error.issues[0].message });
		const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
		await db
			.update(schema.workflows)
			.set({ title: r.data.title, description: r.data.description ?? null, priority: r.data.priority ?? 'normal', updated_at: now })
			.where(eq(schema.workflows.id, workflowId));
		await writeAuditLog({
			db: env.DB,
			account_id: user.id,
			action: 'update',
			resource_type: 'workflow',
			resource_id: workflowId,
			request
		});
	}

	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

	// Re-fetch title in case it was updated above
	const updatedWf = await db.query.workflows.findFirst({ where: eq(schema.workflows.id, workflowId) });
	const workflowTitle = updatedWf?.title ?? wf.title;

	await db
		.update(schema.workflows)
		.set({ status: 'submitted', submitted_at: now, updated_at: now })
		.where(eq(schema.workflows.id, workflowId));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'workflow',
		resource_id: workflowId,
		metadata: { title: workflowTitle }
	});

	// Fire-and-forget: notify all approvers
	const approverIds = wf.approvals.map((a) => a.approver_id);
	sendWorkflowSubmittedEmails(ctx, workflowId, workflowTitle, approverIds, user.name).catch(() => {});

	return { success: true };
}

export async function approveWorkflow(
	ctx: ServiceCtx,
	workflowId: string,
	comment?: string | null
) {
	const { db, env, user } = ctx;
	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

	// Update only the current user's approval step
	await db
		.update(schema.workflow_approvals)
		.set({ status: 'approved', comment: comment ?? null, approved_at: now })
		.where(
			and(
				eq(schema.workflow_approvals.workflow_id, workflowId),
				eq(schema.workflow_approvals.approver_id, user.id)
			)
		);

	// Check if all approval steps are now approved
	const allApprovals = await db
		.select()
		.from(schema.workflow_approvals)
		.where(eq(schema.workflow_approvals.workflow_id, workflowId))
		.orderBy(asc(schema.workflow_approvals.step_order));

	const allApproved = allApprovals.every((a) => a.status === 'approved');
	const nextPending = allApprovals.find((a) => a.status === 'pending');

	if (allApproved) {
		await db
			.update(schema.workflows)
			.set({ status: 'approved', completed_at: now, updated_at: now, current_approver_id: null })
			.where(eq(schema.workflows.id, workflowId));

		// Fire-and-forget: notify requester of full approval
		db.select({ title: schema.workflows.title, requester_id: schema.workflows.requester_id })
			.from(schema.workflows)
			.where(eq(schema.workflows.id, workflowId))
			.limit(1)
			.then(([wf]) => {
				if (wf) {
					sendWorkflowApprovedEmail(ctx, workflowId, wf.title, wf.requester_id).catch(() => {});
				}
			})
			.catch(() => {});
	} else {
		await db
			.update(schema.workflows)
			.set({
				status: 'in_review',
				updated_at: now,
				current_approver_id: nextPending?.approver_id ?? null
			})
			.where(eq(schema.workflows.id, workflowId));
	}

	if (comment) {
		await db.insert(schema.workflow_comments).values({
			workflow_id: workflowId,
			account_id: user.id,
			content: `[Approved] ${comment}`
		});
	}

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'workflow',
		resource_id: workflowId,
		metadata: comment ? { comment } : undefined
	});
	return { success: true };
}

export async function rejectWorkflow(
	ctx: ServiceCtx,
	workflowId: string,
	comment?: string | null
) {
	const { db, env, user } = ctx;
	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

	// Update only the current user's approval step
	await db
		.update(schema.workflow_approvals)
		.set({ status: 'rejected', comment: comment ?? null, approved_at: now })
		.where(
			and(
				eq(schema.workflow_approvals.workflow_id, workflowId),
				eq(schema.workflow_approvals.approver_id, user.id)
			)
		);

	// One rejection closes the whole workflow
	await db
		.update(schema.workflows)
		.set({ status: 'rejected', completed_at: now, updated_at: now, current_approver_id: null })
		.where(eq(schema.workflows.id, workflowId));

	// Fire-and-forget: notify requester of rejection
	db.select({ title: schema.workflows.title, requester_id: schema.workflows.requester_id })
		.from(schema.workflows)
		.where(eq(schema.workflows.id, workflowId))
		.limit(1)
		.then(([wf]) => {
			if (wf) {
				sendWorkflowRejectedEmail(ctx, workflowId, wf.title, wf.requester_id).catch(() => {});
			}
		})
		.catch(() => {});

	if (comment) {
		await db.insert(schema.workflow_comments).values({
			workflow_id: workflowId,
			account_id: user.id,
			content: `[Rejected] ${comment}`
		});
	}

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'workflow',
		resource_id: workflowId,
		metadata: comment ? { comment } : undefined
	});
	return { success: true };
}

export async function uploadWorkflowFile(ctx: ServiceCtx, workflowId: string, file: File) {
	const { db, env, user } = ctx;
	if (!file || file.size === 0) return fail(400, { error: 'No file selected' });
	if (file.size > 10 * 1024 * 1024) return fail(400, { error: 'File exceeds 10 MB limit' });
	if (!ALLOWED_FILE_TYPES.includes(file.type)) return fail(400, { error: 'File type not allowed' });

	const ext = file.name.split('.').pop() ?? '';
	const r2_key = `workflows/${workflowId}/${crypto.randomUUID()}.${ext}`;

	await env.STORAGE.put(r2_key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type }
	});

	await db.insert(schema.workflow_files).values({
		workflow_id: workflowId,
		uploader_id: user.id,
		filename: file.name,
		size: file.size,
		content_type: file.type,
		r2_key
	});

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'workflow_file',
		resource_id: workflowId
	});
	return { success: true };
}

export async function deleteWorkflowFile(ctx: ServiceCtx, fileId: string) {
	const { db, env, user } = ctx;
	if (!fileId) return fail(400, { error: 'Invalid request' });

	const [file] = await db
		.select()
		.from(schema.workflow_files)
		.where(eq(schema.workflow_files.id, fileId));
	if (!file) return fail(404, { error: 'File not found' });

	await env.STORAGE.delete(file.r2_key);
	await db.delete(schema.workflow_files).where(eq(schema.workflow_files.id, fileId));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'workflow_file',
		resource_id: fileId
	});
	return { success: true };
}
