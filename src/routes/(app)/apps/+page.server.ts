import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { listApps, createApp, deleteApp } from '$lib/services/apps';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	return listApps(makeCtx(platform!, locals), {
		bookmarkOnly: url.searchParams.get('bookmark') === '1'
	});
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createApp(makeCtx(platform!, locals, request), {
			name: f.get('name')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || ''
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteApp(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	}
} satisfies Actions;
