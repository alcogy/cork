import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import {
	listCustomers,
	createCustomer,
	updateCustomer,
	deleteCustomer,
	importCustomers
} from '$lib/services/customer';

export const load: PageServerLoad = async ({ platform, url, locals }) => {
	const ctx = makeCtx(platform!, locals);
	return listCustomers(ctx, {
		search: url.searchParams.get('search') || '',
		statusFilter: url.searchParams.get('status') || '',
		page: Math.max(1, parseInt(url.searchParams.get('page') || '1'))
	});
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createCustomer(makeCtx(platform!, locals, request), {
			name: f.get('name')?.toString().trim() ?? '',
			email: f.get('email')?.toString().trim() || null,
			tel: f.get('tel')?.toString().trim() || null,
			fax: f.get('fax')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			status: f.get('status')?.toString() as 'active' | 'inactive' | 'lead'
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateCustomer(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '', {
			name: f.get('name')?.toString().trim() ?? '',
			email: f.get('email')?.toString().trim() || null,
			tel: f.get('tel')?.toString().trim() || null,
			fax: f.get('fax')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			status: (f.get('status')?.toString() || 'active') as 'active' | 'inactive' | 'lead'
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteCustomer(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	},

	import: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return importCustomers(
			makeCtx(platform!, locals, request),
			f.get('file') as File,
			(f.get('mode')?.toString() as 'append' | 'replace') ?? 'append'
		);
	}
} satisfies Actions;
