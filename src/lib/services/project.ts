import { error, fail } from '@sveltejs/kit';
import { asc, count, desc, eq, like } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import type { PROJECT_PRIORITIES } from '$lib/types/project';
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

export async function listProjects(ctx: ServiceCtx, opts: { search: string; page: number }) {
	const { db } = ctx;
	const { search, page } = opts;
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
}

export async function getProject(ctx: ServiceCtx, id: string) {
	const { db, user } = ctx;

	const [project, statuses, categories, allAccounts, files] = await Promise.all([
		db.query.projects.findFirst({
			where: eq(schema.projects.id, id),
			with: {
				status: true,
				category: true,
				creator: true,
				members: { with: { account: true } },
				activities: {
					orderBy: [desc(schema.project_activities.created_at)],
					limit: 20,
					with: { account: true }
				},
				wbs: {
					with: {
						tasks: {
							orderBy: [asc(schema.wbs_tasks.sort_order)],
							with: { assignee: true }
						}
					}
				}
			}
		}),
		db.select().from(schema.project_statuses).orderBy(asc(schema.project_statuses.display_order)),
		db.select().from(schema.project_categories).orderBy(asc(schema.project_categories.display_order)),
		db
			.select({ id: schema.accounts.id, name: schema.accounts.name })
			.from(schema.accounts)
			.orderBy(asc(schema.accounts.name)),
		db.select().from(schema.project_files).where(eq(schema.project_files.project_id, id))
	]);

	if (!project) throw error(404, 'Project not found');

	const memberAccountIds = new Set(project.members.map((m) => m.account_id));
	const availableAccounts = allAccounts.filter((a) => !memberAccountIds.has(a.id));

	return {
		project,
		statuses,
		categories,
		allAccounts,
		availableAccounts,
		files,
		wbs: project.wbs[0] ?? null,
		isOwner: user.role === 'admin' || project.created_by === user.id
	};
}

export async function createProject(
	ctx: ServiceCtx,
	data: {
		title: string;
		description?: string | null;
		status_id?: number | null;
		category_id?: number | null;
		priority?: (typeof PROJECT_PRIORITIES)[number];
		start_date: string;
		end_date: string;
	}
) {
	const { db, env, user, request } = ctx;
	if (!data.title) return fail(400, { error: 'Project name is required' });
	if (!data.start_date) return fail(400, { error: 'Start date is required' });
	if (!data.end_date) return fail(400, { error: 'End date is required' });

	const [project] = await db
		.insert(schema.projects)
		.values({ ...data, priority: data.priority ?? 'medium', created_by: user.id })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'project',
		resource_id: project.id,
		request
	});
	return { success: true };
}

export async function updateProject(
	ctx: ServiceCtx,
	id: string,
	data: {
		title: string;
		description?: string | null;
		status_id?: number | null;
		category_id?: number | null;
		priority: (typeof PROJECT_PRIORITIES)[number];
		start_date?: string | null;
		end_date?: string | null;
	}
) {
	const { db, env, user, request } = ctx;
	if (!data.title) return fail(400, { error: 'Title is required' });

	await db
		.update(schema.projects)
		.set({ ...data, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) })
		.where(eq(schema.projects.id, id));

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'project',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function deleteProject(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.projects).where(eq(schema.projects.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'project',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function addMember(ctx: ServiceCtx, projectId: string, accountId: string) {
	if (!accountId) return fail(400, { error: 'Account is required' });
	await ctx.db.insert(schema.project_members).values({ project_id: projectId, account_id: accountId, role: 'member' });
	return { success: true };
}

export async function removeMember(ctx: ServiceCtx, projectId: string, accountId: string) {
	if (!accountId) return fail(400, { error: 'Invalid request' });
	await ctx.db.delete(schema.project_members).where(eq(schema.project_members.project_id, projectId));
	return { success: true };
}

export async function logActivity(ctx: ServiceCtx, projectId: string, content: string) {
	if (!content) return fail(400, { error: 'Content is required' });
	await ctx.db.insert(schema.project_activities).values({
		project_id: projectId,
		account_id: ctx.user.id,
		type: 'comment',
		content
	});
	return { success: true };
}

export async function createWbs(ctx: ServiceCtx, projectId: string) {
	const { db, env, user, request } = ctx;
	const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, projectId) });
	if (!project) return fail(404, { error: 'Project not found' });
	if (!project.start_date || !project.end_date) {
		return fail(400, { error: 'Set project start date and end date first' });
	}

	const [wbs] = await db
		.insert(schema.wbs)
		.values({
			project_id: projectId,
			title: project.title,
			description: '',
			start_date: project.start_date,
			end_date: project.end_date,
			created_by: user.id
		})
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'wbs',
		resource_id: wbs.id,
		request
	});
	return { success: true };
}

export async function saveWbs(
	ctx: ServiceCtx,
	wbsId: string,
	tasks: { id: string; name: string; assignee: string; plannedStart: string; plannedEnd: string }[]
) {
	const { db, env, user } = ctx;
	await db.delete(schema.wbs_tasks).where(eq(schema.wbs_tasks.wbs_id, wbsId));

	if (tasks.length > 0) {
		await db.insert(schema.wbs_tasks).values(
			tasks.map((t, i) => ({
				wbs_id: wbsId,
				name: t.name || 'Untitled task',
				status: 'todo' as const,
				assignee_id: t.assignee || null,
				planned_start: t.plannedStart || undefined,
				planned_end: t.plannedEnd || undefined,
				sort_order: i
			}))
		);
	}

	await writeAuditLog({ db: env.DB, account_id: user.id, action: 'update', resource_type: 'wbs', resource_id: wbsId });
	return { success: true };
}

export async function addTask(
	ctx: ServiceCtx,
	wbsId: string,
	data: { name: string; assignee_id?: string | null; planned_start?: string; planned_end?: string }
) {
	if (!wbsId || !data.name) return fail(400, { error: 'WBS ID and task name are required' });
	await ctx.db.insert(schema.wbs_tasks).values({
		wbs_id: wbsId,
		name: data.name,
		status: 'todo',
		assignee_id: data.assignee_id ?? null,
		planned_start: data.planned_start ?? '',
		planned_end: data.planned_end ?? ''
	});
	return { success: true };
}

export async function updateTaskStatus(ctx: ServiceCtx, id: string, status: 'todo' | 'in_progress' | 'done') {
	if (!id || !status) return fail(400, { error: 'Invalid request' });
	await ctx.db.update(schema.wbs_tasks).set({ status }).where(eq(schema.wbs_tasks.id, id));
	return { success: true };
}

export async function deleteTask(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'Invalid request' });
	await ctx.db.delete(schema.wbs_tasks).where(eq(schema.wbs_tasks.id, id));
	return { success: true };
}

export async function uploadProjectFile(ctx: ServiceCtx, projectId: string, file: File) {
	const { db, env, user } = ctx;
	if (!file || file.size === 0) return fail(400, { error: 'No file selected' });
	if (file.size > 10 * 1024 * 1024) return fail(400, { error: 'File exceeds 10 MB limit' });
	if (!ALLOWED_FILE_TYPES.includes(file.type)) return fail(400, { error: 'File type not allowed' });

	const ext = file.name.split('.').pop() ?? '';
	const r2_key = `projects/${projectId}/${crypto.randomUUID()}.${ext}`;

	await env.STORAGE.put(r2_key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });

	await db.insert(schema.project_files).values({
		project_id: projectId,
		name: file.name,
		size: file.size,
		r2_key,
		mime_type: file.type,
		uploaded_by: user.id
	});

	await writeAuditLog({ db: env.DB, account_id: user.id, action: 'create', resource_type: 'project_file', resource_id: projectId });
	return { success: true };
}

export async function deleteProjectFile(ctx: ServiceCtx, fileId: string) {
	const { db, env, user } = ctx;
	if (!fileId) return fail(400, { error: 'Invalid request' });

	const [file] = await db.select().from(schema.project_files).where(eq(schema.project_files.id, fileId));
	if (!file) return fail(404, { error: 'File not found' });

	await env.STORAGE.delete(file.r2_key);
	await db.delete(schema.project_files).where(eq(schema.project_files.id, fileId));
	await writeAuditLog({ db: env.DB, account_id: user.id, action: 'delete', resource_type: 'project_file', resource_id: fileId });
	return { success: true };
}
