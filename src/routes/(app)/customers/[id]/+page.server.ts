import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { CUSTOMER_STATUSES } from '$lib/domain/customer/types';

export const load: PageServerLoad = async ({ platform, params }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const customer = await db.query.customers.findFirst({
		where: eq(schema.customers.id, params.id),
		with: {
			contacts: { orderBy: [schema.contacts.created_at] },
			activities: {
				orderBy: [desc(schema.customer_activities.occurred_at)],
				with: { account: true }
			},
			schedules: {
				orderBy: [schema.customer_schedules.start_at],
				with: { account: true }
			},
			notes: {
				orderBy: [desc(schema.customer_notes.created_at)],
				with: { account: true }
			}
		}
	});

	if (!customer) throw error(404, 'Customer not found');

	return { customer };
};

export const actions = {
	updateCustomer: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'Company name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db
			.update(schema.customers)
			.set({
				name,
				email: data.get('email')?.toString().trim() || null,
				tel: data.get('tel')?.toString().trim() || null,
				fax: data.get('fax')?.toString().trim() || null,
				zipcode: data.get('zipcode')?.toString().trim() || null,
				address: data.get('address')?.toString().trim() || null,
				status: (data.get('status')?.toString() || 'active') as (typeof CUSTOMER_STATUSES)[number],
				updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
			})
			.where(eq(schema.customers.id, params.id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'update',
			resource_type: 'customer',
			resource_id: params.id,
			request
		});

		return { success: true };
	},

	createActivity: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const type = data.get('type')?.toString() as 'call' | 'email' | 'meeting' | 'note';
		const note = data.get('note')?.toString().trim() || null;

		if (!type) return fail(400, { error: 'Activity type is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [activity] = await db
			.insert(schema.customer_activities)
			.values({ customer_id: params.id, account_id: locals.user!.id, type, note })
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'customer_activity',
			resource_id: activity.id,
			request
		});

		return { success: true };
	},

	deleteActivity: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.customer_activities).where(eq(schema.customer_activities.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'customer_activity',
			resource_id: id,
			request
		});

		return { success: true };
	},

	createSchedule: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const start_at = data.get('start_at')?.toString();

		if (!title || !start_at) return fail(400, { error: 'Title and start date are required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [schedule] = await db
			.insert(schema.customer_schedules)
			.values({
				customer_id: params.id,
				account_id: locals.user!.id,
				title,
				start_at,
				end_at: data.get('end_at')?.toString() || null,
				note: data.get('note')?.toString().trim() || null
			})
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'customer_schedule',
			resource_id: schedule.id,
			request
		});

		return { success: true };
	},

	deleteSchedule: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.customer_schedules).where(eq(schema.customer_schedules.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'customer_schedule',
			resource_id: id,
			request
		});

		return { success: true };
	},

	createNote: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const content = data.get('content')?.toString().trim();
		const color = data.get('color')?.toString() || 'yellow';

		if (!content) return fail(400, { error: 'Note content is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [note] = await db
			.insert(schema.customer_notes)
			.values({
				customer_id: params.id,
				account_id: locals.user!.id,
				content,
				color: color as 'yellow' | 'blue' | 'green' | 'pink' | 'orange'
			})
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'customer_note',
			resource_id: note.id,
			request
		});

		return { success: true };
	},

	deleteNote: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.customer_notes).where(eq(schema.customer_notes.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'customer_note',
			resource_id: id,
			request
		});

		return { success: true };
	},

	createContact: async ({ request, platform, params, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'Contact name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [contact] = await db
			.insert(schema.contacts)
			.values({
				customer_id: params.id,
				name,
				email: data.get('email')?.toString().trim() || null,
				tel: data.get('tel')?.toString().trim() || null,
				department: data.get('department')?.toString().trim() || null,
				position: data.get('position')?.toString().trim() || null,
				note: data.get('note')?.toString().trim() || null
			})
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'contact',
			resource_id: contact.id,
			request
		});

		return { success: true };
	},

	deleteContact: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.contacts).where(eq(schema.contacts.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'contact',
			resource_id: id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
