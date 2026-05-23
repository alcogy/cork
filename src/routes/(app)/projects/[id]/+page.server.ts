import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import {
	getProject,
	updateProject,
	deleteProject,
	addMember,
	removeMember,
	logActivity,
	createWbs,
	saveWbs,
	addTask,
	updateTaskStatus,
	deleteTask,
	uploadProjectFile,
	deleteProjectFile
} from '$lib/services/project';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	return getProject(makeCtx(platform!, locals), params.id);
};

export const actions = {
	delete: async ({ platform, params, locals }) => {
		await deleteProject(makeCtx(platform!, locals), params.id);
		throw redirect(303, '/projects');
	},

	update: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return updateProject(makeCtx(platform!, locals, request), params.id, {
			title: f.get('title')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
			status_id: f.get('status_id') ? Number(f.get('status_id')) : null,
			category_id: f.get('category_id') ? Number(f.get('category_id')) : null,
			priority: (f.get('priority')?.toString() || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
			start_date: f.get('start_date')?.toString() || null,
			end_date: f.get('end_date')?.toString() || null
		});
	},

	addMember: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return addMember(makeCtx(platform!, locals), params.id, f.get('account_id')?.toString() ?? '');
	},

	removeMember: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return removeMember(makeCtx(platform!, locals), params.id, f.get('account_id')?.toString() ?? '');
	},

	logActivity: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return logActivity(makeCtx(platform!, locals), params.id, f.get('content')?.toString().trim() ?? '');
	},

	createWbs: async ({ platform, params, locals }) => {
		return createWbs(makeCtx(platform!, locals), params.id);
	},

	saveWbs: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const wbs_id = f.get('wbs_id')?.toString() ?? '';
		const tasksJson = f.get('tasks')?.toString() ?? '';
		interface TaskPayload { id: string; name: string; assignee: string; plannedStart: string; plannedEnd: string; }
		let tasks: TaskPayload[];
		try { tasks = JSON.parse(tasksJson); } catch { return { error: 'Invalid task data' }; }
		return saveWbs(makeCtx(platform!, locals), wbs_id, tasks);
	},

	addTask: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return addTask(makeCtx(platform!, locals), f.get('wbs_id')?.toString() ?? '', {
			name: f.get('name')?.toString().trim() ?? '',
			assignee_id: f.get('assignee_id')?.toString() || null,
			planned_start: f.get('planned_start')?.toString() || '',
			planned_end: f.get('planned_end')?.toString() || ''
		});
	},

	updateTaskStatus: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateTaskStatus(makeCtx(platform!, locals), f.get('id')?.toString() ?? '', f.get('status')?.toString() as 'todo' | 'in_progress' | 'done');
	},

	deleteTask: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteTask(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},

	uploadFile: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return uploadProjectFile(makeCtx(platform!, locals), params.id, f.get('file') as File);
	},

	deleteFile: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteProjectFile(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	}
} satisfies Actions;
