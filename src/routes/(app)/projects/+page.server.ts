import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { listProjects, createProject, deleteProject } from '$lib/services/project';

export const load: PageServerLoad = async ({ platform, url, locals }) => {
	return listProjects(makeCtx(platform!, locals), {
		search: url.searchParams.get('search') || '',
		page: Math.max(1, parseInt(url.searchParams.get('page') || '1'))
	});
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createProject(makeCtx(platform!, locals, request), {
			title: f.get('title')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
			status_id: f.get('status_id') ? Number(f.get('status_id')) : null,
			category_id: f.get('category_id') ? Number(f.get('category_id')) : null,
			priority: (f.get('priority')?.toString() || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
			start_date: f.get('start_date')?.toString() ?? '',
			end_date: f.get('end_date')?.toString() ?? ''
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteProject(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	}
} satisfies Actions;
