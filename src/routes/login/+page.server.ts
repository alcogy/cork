import { fail, redirect } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { and, count, eq, gt } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {
	verifyPassword,
	SESSION_COOKIE_OPTIONS,
	createSession
} from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';
import { sendAdminAlertFromEnv } from '$lib/services/email';
import type { Actions, PageServerLoad } from './$types';

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/');
	return {};
};

export const actions = {
	default: async ({ request, cookies, platform }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		const password = data.get('password')?.toString();
		const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		// Rate limit by email: block if too many recent failed attempts
		const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)
			.toISOString()
			.replace('T', ' ')
			.slice(0, 19);

		const [attemptRow] = await db
			.select({ count: count() })
			.from(schema.login_attempts)
			.where(
				and(eq(schema.login_attempts.email, email), gt(schema.login_attempts.attempted_at, cutoff))
			);

		const attemptCount = attemptRow?.count ?? 0;
		if (attemptCount >= MAX_ATTEMPTS) {
			sendAdminAlertFromEnv(platform!.env, {
				subject: 'Login rate limit triggered',
				severity: 'warning',
				summary: `Account "${email}" has been blocked after ${MAX_ATTEMPTS} failed login attempts.`,
				details: {
					Email: email,
					'IP Address': ip,
					'Attempts (15 min)': String(attemptCount)
				}
			});
			return fail(429, {
				error: `Too many login attempts. Please wait ${WINDOW_MINUTES} minutes.`
			});
		}

		const account = await db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});

		if (!account || !(await verifyPassword(password, account.password_hash))) {
			await db.insert(schema.login_attempts).values({ ip_address: ip, email });

			await writeAuditLog({
				db: platform!.env.DB,
				account_id: account?.id ?? null,
				action: 'login_failed',
				resource_type: 'account',
				resource_id: account?.id,
				metadata: { email },
				request
			});

			return fail(401, { error: 'Invalid email or password' });
		}

		// Clear failed attempts on successful login
		await db.delete(schema.login_attempts).where(eq(schema.login_attempts.email, email));

		const token = await createSession(platform!.env.DB, account.id);
		cookies.set('session', token, SESSION_COOKIE_OPTIONS);

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
