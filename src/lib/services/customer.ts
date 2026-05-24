import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { csvToObjects } from '$lib/utils/csv';
import type { CUSTOMER_STATUSES } from '$lib/types/customer';
import type { ServiceCtx } from './index';

const PER_PAGE = 30;

const CustomerStatusSchema = z.enum(['active', 'inactive', 'lead']);
const NoteColorSchema = z.enum(['yellow', 'blue', 'green', 'pink', 'orange']);
const ActivityTypeSchema = z.enum(['call', 'email', 'meeting', 'note']);

const CreateCustomerSchema = z.object({
	name: z.string().min(1, 'Company name is required').max(100, 'Name too long'),
	email: z.string().max(255, 'Email too long').nullable().optional(),
	tel: z.string().max(50, 'Phone too long').nullable().optional(),
	fax: z.string().max(50, 'Fax too long').nullable().optional(),
	zipcode: z.string().max(20, 'Zipcode too long').nullable().optional(),
	address: z.string().max(500, 'Address too long').nullable().optional(),
	status: CustomerStatusSchema.optional()
});

const UpdateCustomerSchema = z.object({
	name: z.string().min(1, 'Company name is required').max(100, 'Name too long'),
	email: z.string().max(255, 'Email too long').nullable().optional(),
	tel: z.string().max(50, 'Phone too long').nullable().optional(),
	fax: z.string().max(50, 'Fax too long').nullable().optional(),
	zipcode: z.string().max(20, 'Zipcode too long').nullable().optional(),
	address: z.string().max(500, 'Address too long').nullable().optional(),
	status: CustomerStatusSchema
});

const CreateActivitySchema = z.object({
	type: ActivityTypeSchema,
	note: z.string().max(5000, 'Note too long').nullable().optional()
});

const CreateScheduleSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
	start_at: z.string().min(1, 'Start date is required'),
	end_at: z.string().nullable().optional(),
	note: z.string().max(2000, 'Note too long').nullable().optional()
});

const CreateNoteSchema = z.object({
	content: z.string().min(1, 'Note content is required').max(5000, 'Note too long'),
	color: NoteColorSchema.optional()
});

const CreateContactSchema = z.object({
	name: z.string().min(1, 'Contact name is required').max(100, 'Name too long'),
	email: z.string().max(255, 'Email too long').nullable().optional(),
	tel: z.string().max(50, 'Phone too long').nullable().optional(),
	department: z.string().max(100, 'Department too long').nullable().optional(),
	position: z.string().max(100, 'Position too long').nullable().optional(),
	note: z.string().max(2000, 'Note too long').nullable().optional()
});

const UpdateContactSchema = CreateContactSchema;
const UpdateScheduleSchema = CreateScheduleSchema;

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

export async function createCustomer(ctx: ServiceCtx, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateCustomerSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [customer] = await db
		.insert(schema.customers)
		.values({ ...r.data, status: r.data.status ?? 'active' })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'customer',
		resource_id: customer.id,
		metadata: { name: r.data.name },
		request
	});

	return { success: true };
}

export async function updateCustomer(ctx: ServiceCtx, id: string, data: unknown) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });

	const r = UpdateCustomerSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	await db
		.update(schema.customers)
		.set({ ...r.data, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) })
		.where(eq(schema.customers.id, id));

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'customer',
		resource_id: id,
		metadata: { name: r.data.name },
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

export async function createActivity(ctx: ServiceCtx, customerId: string, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateActivitySchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [activity] = await db
		.insert(schema.customer_activities)
		.values({
			customer_id: customerId,
			account_id: user.id,
			type: r.data.type,
			note: r.data.note ?? null
		})
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

export async function createSchedule(ctx: ServiceCtx, customerId: string, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateScheduleSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [schedule] = await db
		.insert(schema.customer_schedules)
		.values({
			customer_id: customerId,
			account_id: user.id,
			title: r.data.title,
			start_at: r.data.start_at,
			end_at: r.data.end_at ?? null,
			note: r.data.note ?? null
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

export async function createNote(ctx: ServiceCtx, customerId: string, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateNoteSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [note] = await db
		.insert(schema.customer_notes)
		.values({
			customer_id: customerId,
			account_id: user.id,
			content: r.data.content,
			color: r.data.color ?? 'yellow'
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

export async function createContact(ctx: ServiceCtx, customerId: string, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateContactSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [contact] = await db
		.insert(schema.contacts)
		.values({ customer_id: customerId, ...r.data })
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

export async function updateContact(ctx: ServiceCtx, id: string, data: unknown) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });

	const r = UpdateContactSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	await db.update(schema.contacts).set(r.data).where(eq(schema.contacts.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'contact',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function updateSchedule(ctx: ServiceCtx, id: string, data: unknown) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });

	const r = UpdateScheduleSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	await db.update(schema.customer_schedules).set(r.data).where(eq(schema.customer_schedules.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'customer_schedule',
		resource_id: id,
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
