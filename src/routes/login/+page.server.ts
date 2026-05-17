import { fail, redirect } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { verifyPassword, SESSION_COOKIE_OPTIONS } from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/');
	return {};
};

export const actions = {
	default: async ({ request, cookies, platform }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		const db = drizzle(platform!.env.DB, { schema });
		const account = await db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});

		if (!account || !(await verifyPassword(password, account.password_hash))) {
			return fail(401, { error: 'Invalid email or password' });
		}

		cookies.set('session', account.id, SESSION_COOKIE_OPTIONS);

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: account.id,
			action: 'login',
			resource_type: 'account',
			resource_id: account.id,
			request
		});

		throw redirect(302, '/');
	}
} satisfies Actions;
