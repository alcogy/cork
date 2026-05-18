import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import {
	getCustomer,
	updateCustomer,
	createActivity,
	deleteActivity,
	createSchedule,
	deleteSchedule,
	createNote,
	deleteNote,
	createContact,
	deleteContact
} from '$lib/services/customer';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	const customer = await getCustomer(makeCtx(platform!, locals), params.id);
	if (!customer) throw error(404, 'Customer not found');
	return { customer };
};

export const actions = {
	updateCustomer: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return updateCustomer(makeCtx(platform!, locals, request), params.id, {
			name: f.get('name')?.toString().trim() ?? '',
			email: f.get('email')?.toString().trim() || null,
			tel: f.get('tel')?.toString().trim() || null,
			fax: f.get('fax')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			status: (f.get('status')?.toString() || 'active') as 'active' | 'inactive' | 'lead'
		});
	},

	createActivity: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return createActivity(makeCtx(platform!, locals, request), params.id, {
			type: f.get('type')?.toString() as 'call' | 'email' | 'meeting' | 'note',
			note: f.get('note')?.toString().trim() || null
		});
	},

	deleteActivity: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteActivity(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	},

	createSchedule: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return createSchedule(makeCtx(platform!, locals, request), params.id, {
			title: f.get('title')?.toString().trim() ?? '',
			start_at: f.get('start_at')?.toString() ?? '',
			end_at: f.get('end_at')?.toString() || null,
			note: f.get('note')?.toString().trim() || null
		});
	},

	deleteSchedule: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteSchedule(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	},

	createNote: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return createNote(makeCtx(platform!, locals, request), params.id, {
			content: f.get('content')?.toString().trim() ?? '',
			color: f.get('color')?.toString() || 'yellow'
		});
	},

	deleteNote: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteNote(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	},

	createContact: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return createContact(makeCtx(platform!, locals, request), params.id, {
			name: f.get('name')?.toString().trim() ?? '',
			email: f.get('email')?.toString().trim() || null,
			tel: f.get('tel')?.toString().trim() || null,
			department: f.get('department')?.toString().trim() || null,
			position: f.get('position')?.toString().trim() || null,
			note: f.get('note')?.toString().trim() || null
		});
	},

	deleteContact: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteContact(makeCtx(platform!, locals, request), f.get('id')?.toString() ?? '');
	}
} satisfies Actions;
