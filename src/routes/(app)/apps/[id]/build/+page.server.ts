import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { getAppDef, saveAppDefinition, deleteAppAdmin } from '$lib/services/apps';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	return getAppDef(makeCtx(platform!, locals), params.id);
};

export const actions = {
	save: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return saveAppDefinition(makeCtx(platform!, locals), params.id, {
			name: f.get('name')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() ?? '',
			fields: f.get('fields')?.toString() ?? '[]'
		});
	},

	delete: async ({ platform, params, locals }) => {
		return deleteAppAdmin(makeCtx(platform!, locals), params.id);
	}
} satisfies Actions;
