import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword, validatePasswordStrength } from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';
import type { ServiceCtx } from './index';

export async function listAccounts(ctx: ServiceCtx) {
	if (ctx.user.role !== 'admin') throw error(403, 'Forbidden');
	return ctx.db
		.select({ id: schema.accounts.id, email: schema.accounts.email, name: schema.accounts.name, role: schema.accounts.role, created_at: schema.accounts.created_at })
		.from(schema.accounts)
		.orderBy(asc(schema.accounts.created_at));
}

export async function createAccount(
	ctx: ServiceCtx,
	data: { email: string; name: string; password: string; role: 'admin' | 'general' }
) {
	const { db, env, user, request } = ctx;
	if (user.role !== 'admin') return fail(403, { error: 'Forbidden' });
	if (!data.email || !data.name || !data.password) return fail(400, { error: 'All fields are required' });

	const strengthError = validatePasswordStrength(data.password);
	if (strengthError) return fail(400, { error: strengthError });

	const password_hash = await hashPassword(data.password);

	try {
		const [account] = await db
			.insert(schema.accounts)
			.values({ email: data.email, name: data.name, password_hash, role: data.role ?? 'general' })
			.returning();

		await writeAuditLog({ db: env.DB, account_id: user.id, action: 'create', resource_type: 'account', resource_id: account.id, request });
		return { success: true };
	} catch {
		return fail(409, { error: 'Email address already in use' });
	}
}

export async function updateAccount(
	ctx: ServiceCtx,
	id: string,
	data: { name: string; role: 'admin' | 'general'; password?: string }
) {
	const { db, env, user, request } = ctx;
	if (user.role !== 'admin') return fail(403, { error: 'Forbidden' });
	if (!id || !data.name) return fail(400, { error: 'Invalid request' });

	const updateData: Record<string, unknown> = {
		name: data.name,
		role: data.role ?? 'general',
		updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
	};

	if (data.password) {
		const strengthError = validatePasswordStrength(data.password);
		if (strengthError) return fail(400, { error: strengthError });
		updateData.password_hash = await hashPassword(data.password);
	}

	await db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, id));
	await writeAuditLog({ db: env.DB, account_id: user.id, action: 'update', resource_type: 'account', resource_id: id, request });
	return { success: true };
}

export async function deleteAccount(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (user.role !== 'admin') return fail(403, { error: 'Forbidden' });
	if (!id) return fail(400, { error: 'Invalid request' });
	if (id === user.id) return fail(400, { error: 'Cannot delete your own account' });

	await db.delete(schema.accounts).where(eq(schema.accounts.id, id));
	await writeAuditLog({ db: env.DB, account_id: user.id, action: 'delete', resource_type: 'account', resource_id: id, request });
	return { success: true };
}
