import { z } from 'zod';
import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword, validatePasswordStrength, deleteAllSessions } from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';
import type { ServiceCtx } from './index';

const RoleSchema = z.enum(['admin', 'general']);

const CreateAccountSchema = z.object({
	email: z.email({ error: 'Invalid email address' }),
	name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
	password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
	role: RoleSchema.default('general')
});

const UpdateAccountSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
	role: RoleSchema.default('general'),
	password: z.string().max(128, 'Password too long').optional()
});

export async function listAccounts(ctx: ServiceCtx) {
	if (ctx.user.role !== 'admin') throw error(403, 'Forbidden');
	return ctx.db
		.select({
			id: schema.accounts.id,
			email: schema.accounts.email,
			name: schema.accounts.name,
			role: schema.accounts.role,
			created_at: schema.accounts.created_at
		})
		.from(schema.accounts)
		.orderBy(asc(schema.accounts.created_at));
}

export async function createAccount(ctx: ServiceCtx, data: unknown) {
	const { env, user, request } = ctx;
	if (user.role !== 'admin') return fail(403, { error: 'Forbidden' });

	const r = CreateAccountSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const strengthError = validatePasswordStrength(r.data.password);
	if (strengthError) return fail(400, { error: strengthError });

	const password_hash = await hashPassword(r.data.password);

	try {
		const [account] = await ctx.db
			.insert(schema.accounts)
			.values({ email: r.data.email, name: r.data.name, password_hash, role: r.data.role })
			.returning();

		await writeAuditLog({
			db: env.DB,
			account_id: user.id,
			action: 'create',
			resource_type: 'account',
			resource_id: account.id,
			request
		});
		return { success: true };
	} catch {
		return fail(409, { error: 'Email address already in use' });
	}
}

export async function updateAccount(ctx: ServiceCtx, id: string, data: unknown) {
	const { db, env, user, request } = ctx;
	if (user.role !== 'admin') return fail(403, { error: 'Forbidden' });
	if (!id) return fail(400, { error: 'Invalid request' });

	const r = UpdateAccountSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const updateData: Record<string, unknown> = {
		name: r.data.name,
		role: r.data.role,
		updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
	};

	if (r.data.password) {
		const strengthError = validatePasswordStrength(r.data.password);
		if (strengthError) return fail(400, { error: strengthError });
		updateData.password_hash = await hashPassword(r.data.password);
		// Invalidate all sessions for this account when password changes
		await deleteAllSessions(env.DB, id);
	}

	await db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'account',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function deleteAccount(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (user.role !== 'admin') return fail(403, { error: 'Forbidden' });
	if (!id) return fail(400, { error: 'Invalid request' });
	if (id === user.id) return fail(400, { error: 'Cannot delete your own account' });

	await db.delete(schema.accounts).where(eq(schema.accounts.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'account',
		resource_id: id,
		request
	});
	return { success: true };
}
