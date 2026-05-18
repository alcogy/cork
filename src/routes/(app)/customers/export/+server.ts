import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, like, or } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { objectsToCsv } from '$lib/utils/csv';
import { writeAuditLog } from '$lib/server/audit';
import { CUSTOMER_STATUS_LABELS } from '$lib/types/customer';

export const GET: RequestHandler = async ({ platform, url, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const search = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';

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
		conditions.push(eq(schema.customers.status, statusFilter as 'active' | 'inactive' | 'lead'));
	}

	const customers = await db.query.customers.findMany({
		where: conditions.length > 0 ? and(...conditions) : undefined,
		orderBy: [schema.customers.name]
	});

	const rows = customers.map((c) => ({
		name: c.name,
		email: c.email ?? '',
		tel: c.tel ?? '',
		fax: c.fax ?? '',
		zipcode: c.zipcode ?? '',
		address: c.address ?? '',
		status: CUSTOMER_STATUS_LABELS[c.status] ?? c.status,
		created_at: c.created_at
	}));

	await writeAuditLog({
		db: platform!.env.DB,
		account_id: locals.user!.id,
		action: 'export',
		resource_type: 'customer',
		metadata: { count: rows.length }
	});

	const csv = objectsToCsv(rows, ['name', 'email', 'tel', 'fax', 'zipcode', 'address', 'status', 'created_at']);
	const date = new Date().toISOString().slice(0, 10);

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="customers-${date}.csv"`
		}
	});
};
