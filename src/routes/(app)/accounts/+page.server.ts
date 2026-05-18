import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import { listAccounts, createAccount, updateAccount, deleteAccount } from '$lib/services/account';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const accounts = await listAccounts(makeCtx(platform!, locals));
	return { accounts };
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createAccount(makeCtx(platform!, locals, request), {
			email: f.get('email')?.toString().trim().toLowerCase() ?? '',
			name: f.get('name')?.toString().trim() ?? '',
			password: f.get('password')?.toString() ?? '',
			role: (f.get('role')?.toString() || 'general') as 'admin' | 'general'
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateAccount(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '', {
			name: f.get('name')?.toString().trim() ?? '',
			role: (f.get('role')?.toString() || 'general') as 'admin' | 'general',
			password: f.get('password')?.toString() || undefined
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteAccount(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	}
} satisfies Actions;
