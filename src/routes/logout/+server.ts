import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_OPTIONS, deleteSession } from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';

// GET: safe fallback — does not delete session (GET must be side-effect-free)
export const GET: RequestHandler = async ({ locals }) => {
	throw redirect(302, locals.user ? '/' : '/login');
};

// POST: actual logout — delete session and redirect
export const POST: RequestHandler = async ({ cookies, locals, platform }) => {
	const token = cookies.get('session');
	const userId = locals.user?.id ?? null;

	const { maxAge, ...deleteOptions } = SESSION_COOKIE_OPTIONS;
	cookies.delete('session', deleteOptions);

	if (token) {
		await deleteSession(platform!.env.DB, token);
	}

	if (userId) {
		await writeAuditLog({
			db: platform!.env.DB,
			account_id: userId,
			action: 'logout',
			resource_type: 'account',
			resource_id: userId
		});
	}

	throw redirect(302, '/login');
};
