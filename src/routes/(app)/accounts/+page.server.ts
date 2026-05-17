import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword, validatePasswordStrength } from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Forbidden');

	const db = drizzle(platform!.env.DB, { schema });
	const accounts = await db.select({
		id: schema.accounts.id,
		email: schema.accounts.email,
		name: schema.accounts.name,
		role: schema.accounts.role,
		created_at: schema.accounts.created_at
	}).from(schema.accounts).orderBy(asc(schema.accounts.created_at));

	return { accounts };
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		const name = data.get('name')?.toString().trim();
		const password = data.get('password')?.toString();
		const role = data.get('role')?.toString() as 'admin' | 'general';

		if (!email || !name || !password) return fail(400, { error: 'All fields are required' });

		const strengthError = validatePasswordStrength(password);
		if (strengthError) return fail(400, { error: strengthError });

		const db = drizzle(platform!.env.DB, { schema });
		const password_hash = await hashPassword(password);

		try {
			const [account] = await db
				.insert(schema.accounts)
				.values({ email, name, password_hash, role: role || 'general' })
				.returning();

			await writeAuditLog({
				db: platform!.env.DB,
				account_id: locals.user.id,
				action: 'create',
				resource_type: 'account',
				resource_id: account.id,
				request
			});

			return { success: true };
		} catch {
			return fail(409, { error: 'Email address already in use' });
		}
	},

	update: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		const role = data.get('role')?.toString() as 'admin' | 'general';
		const password = data.get('password')?.toString();

		if (!id || !name) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });

		const updateData: Record<string, unknown> = {
			name,
			role: role || 'general',
			updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
		};

		if (password) {
			const strengthError = validatePasswordStrength(password);
			if (strengthError) return fail(400, { error: strengthError });
			updateData.password_hash = await hashPassword(password);
		}

		await db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user.id,
			action: 'update',
			resource_type: 'account',
			resource_id: id,
			request
		});

		return { success: true };
	},

	delete: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { error: 'Invalid request' });
		if (id === locals.user.id) return fail(400, { error: 'Cannot delete your own account' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.accounts).where(eq(schema.accounts.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user.id,
			action: 'delete',
			resource_type: 'account',
			resource_id: id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
