import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { getRecord, updateRecord, deleteRecord } from '$lib/services/apps';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	return getRecord(makeCtx(platform!, locals), params.id, params.recordId);
};

export const actions = {
	update: async ({ request, platform, params, locals }) => {
		return updateRecord(
			makeCtx(platform!, locals, request),
			params.id,
			params.recordId,
			await request.formData()
		);
	},

	delete: async ({ platform, params, locals, request }) => {
		await deleteRecord(makeCtx(platform!, locals, request), params.recordId);
		throw redirect(303, `/apps/${params.id}`);
	}
} satisfies Actions;
