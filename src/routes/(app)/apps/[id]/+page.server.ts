import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { getApp, createRecord, deleteRecord, togglePublish } from '$lib/services/apps';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	const result = await getApp(makeCtx(platform!, locals), params.id);
	if (result.app.fieldsParsed.length === 0 && locals.user?.role !== 'admin') throw redirect(303, '/apps');
	return result;
};

export const actions = {
	create: async ({ request, platform, params, locals }) => {
		return createRecord(makeCtx(platform!, locals, request), params.id, await request.formData());
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteRecord(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	},

	togglePublish: async ({ platform, params, locals }) => {
		return togglePublish(makeCtx(platform!, locals), params.id);
	}
} satisfies Actions;
