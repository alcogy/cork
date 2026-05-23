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

const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

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
	},

	uploadAvatar: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const file = f.get('avatar') as File;

		if (!file || file.size === 0) return fail(400, { error: 'No file selected' });
		if (file.size > AVATAR_MAX_BYTES) return fail(400, { error: 'File exceeds 2 MB limit' });
		if (!AVATAR_ALLOWED_TYPES.includes(file.type)) return fail(400, { error: 'Only JPEG, PNG, GIF, WebP allowed' });

		const r2Key = `avatars/${locals.user!.id}`;
		await platform!.env.STORAGE.put(r2Key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type }
		});

		const db = drizzle(platform!.env.DB, { schema });
		await db
			.update(schema.accounts)
			.set({ avatar_key: r2Key, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) })
			.where(eq(schema.accounts.id, locals.user!.id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'update',
			resource_type: 'account',
			resource_id: locals.user!.id,
			request
		});

		return { avatarSuccess: true };
	},

	deleteAvatar: async ({ platform, locals }) => {
		const db = drizzle(platform!.env.DB, { schema });
		const account = await db.query.accounts.findFirst({
			where: eq(schema.accounts.id, locals.user!.id)
		});

		if (account?.avatar_key) {
			await platform!.env.STORAGE.delete(account.avatar_key);
		}

		await db
			.update(schema.accounts)
			.set({ avatar_key: null, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) })
			.where(eq(schema.accounts.id, locals.user!.id));

		return { avatarDeleted: true };
	}
} satisfies Actions;
