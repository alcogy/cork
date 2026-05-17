import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { PROJECT_PRIORITIES } from '$lib/domain/project/types';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const [project, statuses, categories, allAccounts, files] = await Promise.all([
		db.query.projects.findFirst({
			where: eq(schema.projects.id, params.id),
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
		db.select({ id: schema.accounts.id, name: schema.accounts.name }).from(schema.accounts).orderBy(asc(schema.accounts.name)),
		db.select().from(schema.project_files).where(eq(schema.project_files.project_id, params.id))
	]);

	if (!project) throw error(404, 'Project not found');

	const memberAccountIds = new Set(project.members.map((m) => m.account_id));
	const availableAccounts = allAccounts.filter((a) => !memberAccountIds.has(a.id));

	// The first WBS linked to this project (one per project for now)
	const wbs = project.wbs[0] ?? null;

	return {
		project,
		statuses,
		categories,
		allAccounts,
		availableAccounts,
		files,
		wbs,
		isOwner: locals.user?.role === 'admin' || project.created_by === locals.user?.id
	};
};

export const actions = {
	update: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		if (!title) return fail(400, { error: 'Title is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.update(schema.projects).set({
			title,
			description: data.get('description')?.toString().trim() || null,
			status_id: data.get('status_id') ? Number(data.get('status_id')) : null,
			category_id: data.get('category_id') ? Number(data.get('category_id')) : null,
			priority: (data.get('priority')?.toString() || 'medium') as (typeof PROJECT_PRIORITIES)[number],
			start_date: data.get('start_date')?.toString() || null,
			end_date: data.get('end_date')?.toString() || null,
			updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
		}).where(eq(schema.projects.id, params.id));

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'update', resource_type: 'project', resource_id: params.id, request });
		return { success: true };
	},

	addMember: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const account_id = data.get('account_id')?.toString();
		if (!account_id) return fail(400, { error: 'Account is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_members).values({
			project_id: params.id,
			account_id,
			role: 'member'
		});
		return { success: true };
	},

	removeMember: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const account_id = data.get('account_id')?.toString();
		if (!account_id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.project_members)
			.where(eq(schema.project_members.project_id, params.id));
		return { success: true };
	},

	logActivity: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const content = data.get('content')?.toString().trim();
		if (!content) return fail(400, { error: 'Content is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_activities).values({
			project_id: params.id,
			account_id: locals.user!.id,
			type: 'comment',
			content
		});
		return { success: true };
	},

	createWbs: async ({ request, platform, params, locals }) => {
		const db = drizzle(platform!.env.DB, { schema });
		const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, params.id) });
		if (!project) return fail(404, { error: 'Project not found' });
		if (!project.start_date || !project.end_date) {
			return fail(400, { error: 'Set project start date and end date first' });
		}

		const [wbs] = await db.insert(schema.wbs).values({
			project_id: params.id,
			title: project.title,
			description: '',
			start_date: project.start_date,
			end_date: project.end_date,
			created_by: locals.user!.id
		}).returning();

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'create', resource_type: 'wbs', resource_id: wbs.id, request });
		return { success: true };
	},

	addTask: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const wbs_id = data.get('wbs_id')?.toString();
		const name = data.get('name')?.toString().trim();
		if (!wbs_id || !name) return fail(400, { error: 'WBS ID and task name are required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.wbs_tasks).values({
			wbs_id,
			name,
			status: 'todo',
			assignee_id: data.get('assignee_id')?.toString() || null,
			planned_start: data.get('planned_start')?.toString() || '',
			planned_end: data.get('planned_end')?.toString() || ''
		});
		return { success: true };
	},

	updateTaskStatus: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const status = data.get('status')?.toString() as 'todo' | 'in_progress' | 'done';
		if (!id || !status) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.update(schema.wbs_tasks).set({ status }).where(eq(schema.wbs_tasks.id, id));
		return { success: true };
	},

	deleteTask: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.wbs_tasks).where(eq(schema.wbs_tasks.id, id));
		return { success: true };
	},

	uploadFile: async ({ request, platform, params, locals }) => {
		const MAX_SIZE = 10 * 1024 * 1024;
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
		const r2_key = `projects/${params.id}/${crypto.randomUUID()}.${ext}`;

		await platform!.env.STORAGE.put(r2_key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type }
		});

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_files).values({
			project_id: params.id,
			name: file.name,
			size: file.size,
			r2_key,
			mime_type: file.type,
			uploaded_by: locals.user!.id
		});

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'create', resource_type: 'project_file', resource_id: params.id });
		return { success: true };
	},

	deleteFile: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		const [file] = await db.select().from(schema.project_files).where(eq(schema.project_files.id, id));
		if (!file) return fail(404, { error: 'File not found' });

		await platform!.env.STORAGE.delete(file.r2_key);
		await db.delete(schema.project_files).where(eq(schema.project_files.id, id));

		await writeAuditLog({ db: platform!.env.DB, account_id: locals.user!.id, action: 'delete', resource_type: 'project_file', resource_id: id });
		return { success: true };
	}
} satisfies Actions;
