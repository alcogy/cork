import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {
	hashPassword,
	verifyPassword,
	validatePasswordStrength,
	deleteAllSessions
} from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });
	const account = await db.query.accounts.findFirst({
		where: eq(schema.accounts.id, locals.user!.id)
	});

	return { account };
};

export const actions = {
	update: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const currentPassword = data.get('current_password')?.toString();
		const newPassword = data.get('new_password')?.toString();

		if (!name) return fail(400, { error: 'Name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const account = await db.query.accounts.findFirst({
			where: eq(schema.accounts.id, locals.user!.id)
		});

		if (!account) return fail(404, { error: 'Account not found' });

		const updateData: Record<string, unknown> = {
			name,
			updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
		};

		if (newPassword) {
			if (!currentPassword)
				return fail(400, { error: 'Current password is required to set a new password' });
			const valid = await verifyPassword(currentPassword, account.password_hash);
			if (!valid) return fail(401, { error: 'Current password is incorrect' });

			const strengthError = validatePasswordStrength(newPassword);
			if (strengthError) return fail(400, { error: strengthError });

			updateData.password_hash = await hashPassword(newPassword);
			// Invalidate all sessions when password changes
			await deleteAllSessions(platform!.env.DB, locals.user!.id);
		}

		await db
			.update(schema.accounts)
			.set(updateData)
			.where(eq(schema.accounts.id, locals.user!.id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'update',
			resource_type: 'account',
			resource_id: locals.user!.id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
