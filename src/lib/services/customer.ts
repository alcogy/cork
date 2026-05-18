import { fail } from '@sveltejs/kit';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { csvToObjects } from '$lib/utils/csv';
import type { CUSTOMER_STATUSES } from '$lib/types/customer';
import type { ServiceCtx } from './index';

const PER_PAGE = 30;

export async function listCustomers(
	ctx: ServiceCtx,
	opts: { search: string; statusFilter: string; page: number }
) {
	const { db } = ctx;
	const { search, statusFilter, page } = opts;

	const conditions = [];
	if (search) {
		conditions.push(
			or(
				like(schema.customers.name, `%${search}%`),
				like(schema.customers.email, `%${search}%`),
				like(schema.customers.tel, `%${search}%`)
			)
		);
	}
	if (statusFilter && statusFilter !== 'all') {
		conditions.push(
			eq(schema.customers.status, statusFilter as (typeof CUSTOMER_STATUSES)[number])
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult, customers] = await Promise.all([
		db.select({ count: count() }).from(schema.customers).where(where),
		db.query.customers.findMany({
			where,
			orderBy: [desc(schema.customers.created_at)],
			limit: PER_PAGE,
			offset: (page - 1) * PER_PAGE
		})
	]);

	const total = countResult[0]?.count ?? 0;
	const noteCounts: Record<string, number> = {};

	if (customers.length > 0) {
		const ids = customers.map((c) => c.id);
		const rows = await db
			.select({ customer_id: schema.customer_notes.customer_id, count: count() })
			.from(schema.customer_notes)
			.where(
				sql`${schema.customer_notes.customer_id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
			)
			.groupBy(schema.customer_notes.customer_id);
		for (const row of rows) noteCounts[row.customer_id] = row.count;
	}

	return {
		customers: customers.map((c) => ({ ...c, note_count: noteCounts[c.id] ?? 0 })),
		total,
		page,
		totalPages: Math.ceil(total / PER_PAGE),
		search,
		statusFilter
	};
}

export async function getCustomer(ctx: ServiceCtx, id: string) {
	return ctx.db.query.customers.findFirst({
		where: eq(schema.customers.id, id),
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
}

export async function createCustomer(
	ctx: ServiceCtx,
	data: {
		name: string;
		email?: string | null;
		tel?: string | null;
		fax?: string | null;
		zipcode?: string | null;
		address?: string | null;
		status?: (typeof CUSTOMER_STATUSES)[number];
	}
) {
	const { db, env, user, request } = ctx;
	if (!data.name) return fail(400, { error: 'Company name is required' });

	const [customer] = await db
		.insert(schema.customers)
		.values({ ...data, status: data.status ?? 'active' })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'customer',
		resource_id: customer.id,
		request
	});

	return { success: true };
}

export async function updateCustomer(
	ctx: ServiceCtx,
	id: string,
	data: {
		name: string;
		email?: string | null;
		tel?: string | null;
		fax?: string | null;
		zipcode?: string | null;
		address?: string | null;
		status: (typeof CUSTOMER_STATUSES)[number];
	}
) {
	const { db, env, user, request } = ctx;
	if (!id || !data.name) return fail(400, { error: 'Invalid request' });

	await db
		.update(schema.customers)
		.set({ ...data, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) })
		.where(eq(schema.customers.id, id));

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'customer',
		resource_id: id,
		request
	});

	return { success: true };
}

export async function deleteCustomer(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });

	await db.delete(schema.customers).where(eq(schema.customers.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'customer',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function importCustomers(ctx: ServiceCtx, file: File, mode: 'append' | 'replace') {
	const { db, env, user, request } = ctx;
	if (!file || file.size === 0) return fail(400, { error: 'No file uploaded' });
	if (file.size > 5 * 1024 * 1024) return fail(400, { error: 'File too large (max 5 MB)' });

	const rows = csvToObjects(await file.text());
	if (rows.length === 0) return fail(400, { error: 'CSV file is empty or invalid' });

	if (mode === 'replace') await db.delete(schema.customers);

	const values = rows
		.map((row) => ({
			name: row['name'] || row['Company name'] || '',
			email: row['email'] || row['Email'] || null,
			tel: row['tel'] || row['Phone'] || null,
			fax: row['fax'] || row['Fax'] || null,
			zipcode: row['zipcode'] || row['Zip'] || null,
			address: row['address'] || row['Address'] || null,
			status: 'active' as const
		}))
		.filter((v) => v.name);

	if (values.length === 0) return fail(400, { error: 'No valid rows found in CSV' });

	await db.insert(schema.customers).values(values);
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'import',
		resource_type: 'customer',
		metadata: { count: values.length, mode },
		request
	});
	return { success: true };
}

export async function createActivity(
	ctx: ServiceCtx,
	customerId: string,
	data: { type: 'call' | 'email' | 'meeting' | 'note'; note?: string | null }
) {
	const { db, env, user, request } = ctx;
	if (!data.type) return fail(400, { error: 'Activity type is required' });

	const [activity] = await db
		.insert(schema.customer_activities)
		.values({ customer_id: customerId, account_id: user.id, type: data.type, note: data.note ?? null })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'customer_activity',
		resource_id: activity.id,
		request
	});
	return { success: true };
}

export async function deleteActivity(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.customer_activities).where(eq(schema.customer_activities.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'customer_activity',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function createSchedule(
	ctx: ServiceCtx,
	customerId: string,
	data: { title: string; start_at: string; end_at?: string | null; note?: string | null }
) {
	const { db, env, user, request } = ctx;
	if (!data.title || !data.start_at) return fail(400, { error: 'Title and start date are required' });

	const [schedule] = await db
		.insert(schema.customer_schedules)
		.values({
			customer_id: customerId,
			account_id: user.id,
			title: data.title,
			start_at: data.start_at,
			end_at: data.end_at ?? null,
			note: data.note ?? null
		})
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'customer_schedule',
		resource_id: schedule.id,
		request
	});
	return { success: true };
}

export async function deleteSchedule(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.customer_schedules).where(eq(schema.customer_schedules.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'customer_schedule',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function createNote(
	ctx: ServiceCtx,
	customerId: string,
	data: { content: string; color?: string }
) {
	const { db, env, user, request } = ctx;
	if (!data.content) return fail(400, { error: 'Note content is required' });

	const [note] = await db
		.insert(schema.customer_notes)
		.values({
			customer_id: customerId,
			account_id: user.id,
			content: data.content,
			color: (data.color ?? 'yellow') as 'yellow' | 'blue' | 'green' | 'pink' | 'orange'
		})
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'customer_note',
		resource_id: note.id,
		request
	});
	return { success: true };
}

export async function deleteNote(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.customer_notes).where(eq(schema.customer_notes.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'customer_note',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function createContact(
	ctx: ServiceCtx,
	customerId: string,
	data: {
		name: string;
		email?: string | null;
		tel?: string | null;
		department?: string | null;
		position?: string | null;
		note?: string | null;
	}
) {
	const { db, env, user, request } = ctx;
	if (!data.name) return fail(400, { error: 'Contact name is required' });

	const [contact] = await db
		.insert(schema.contacts)
		.values({ customer_id: customerId, ...data })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'contact',
		resource_id: contact.id,
		request
	});
	return { success: true };
}

export async function deleteContact(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'contact',
		resource_id: id,
		request
	});
	return { success: true };
}
