import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_OPTIONS } from '$lib/server/auth/index';
import { writeAuditLog } from '$lib/server/audit';

export const GET: RequestHandler = async ({ cookies, locals, platform }) => {
	const userId = locals.user?.id ?? null;

	const { maxAge, ...deleteOptions } = SESSION_COOKIE_OPTIONS;
	cookies.delete('session', deleteOptions);

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
