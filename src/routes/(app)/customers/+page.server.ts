import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import { hashPassword } from '$lib/server/auth/index';
import { csvToObjects } from '$lib/utils/csv';
import { CUSTOMER_STATUSES } from '$lib/domain/customer/types';

const PER_PAGE = 30;

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const search = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

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
		conditions.push(eq(schema.customers.status, statusFilter as (typeof CUSTOMER_STATUSES)[number]));
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

	// Note counts per customer
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
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const email = data.get('email')?.toString().trim() || null;
		const tel = data.get('tel')?.toString().trim() || null;
		const fax = data.get('fax')?.toString().trim() || null;
		const zipcode = data.get('zipcode')?.toString().trim() || null;
		const address = data.get('address')?.toString().trim() || null;
		const status = data.get('status')?.toString() as (typeof CUSTOMER_STATUSES)[number];

		if (!name) return fail(400, { error: 'Company name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [customer] = await db
			.insert(schema.customers)
			.values({ name, email, tel, fax, zipcode, address, status: status || 'active' })
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'customer',
			resource_id: customer.id,
			request
		});

		return { success: true };
	},

	update: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();

		if (!id || !name) return fail(400, { error: 'Invalid request' });

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
			.where(eq(schema.customers.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'update',
			resource_type: 'customer',
			resource_id: id,
			request
		});

		return { success: true };
	},

	delete: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.customers).where(eq(schema.customers.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'customer',
			resource_id: id,
			request
		});

		return { success: true };
	},

	import: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const file = data.get('file') as File | null;
		const mode = data.get('mode')?.toString() as 'append' | 'replace';

		if (!file || file.size === 0) return fail(400, { error: 'No file uploaded' });
		if (file.size > 5 * 1024 * 1024) return fail(400, { error: 'File too large (max 5 MB)' });

		const text = await file.text();
		const rows = csvToObjects(text);
		if (rows.length === 0) return fail(400, { error: 'CSV file is empty or invalid' });

		const db = drizzle(platform!.env.DB, { schema });

		if (mode === 'replace') {
			await db.delete(schema.customers);
		}

		const values = rows.map((row) => ({
			name: row['name'] || row['Company name'] || '',
			email: row['email'] || row['Email'] || null,
			tel: row['tel'] || row['Phone'] || null,
			fax: row['fax'] || row['Fax'] || null,
			zipcode: row['zipcode'] || row['Zip'] || null,
			address: row['address'] || row['Address'] || null,
			status: 'active' as const
		})).filter((v) => v.name);

		if (values.length === 0) return fail(400, { error: 'No valid rows found in CSV' });

		await db.insert(schema.customers).values(values);

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'import',
			resource_type: 'customer',
			metadata: { count: values.length, mode },
			request
		});

		return { success: true };
	}
} satisfies Actions;
