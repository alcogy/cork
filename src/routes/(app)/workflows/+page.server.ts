import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { listWorkflows, createWorkflow } from '$lib/services/workflow';

export const load: PageServerLoad = async ({ platform, url, locals }) => {
	return listWorkflows(makeCtx(platform!, locals), {
		statusFilter: url.searchParams.get('status') || '',
		page: Math.max(1, parseInt(url.searchParams.get('page') || '1'))
	});
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createWorkflow(makeCtx(platform!, locals, request), {
			title: f.get('title')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
			priority: (f.get('priority')?.toString() || 'normal') as 'low' | 'normal' | 'high' | 'urgent'
		});
	}
} satisfies Actions;
