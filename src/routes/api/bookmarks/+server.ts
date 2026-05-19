import { json, error } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// Reject cross-origin requests
	const origin = request.headers.get('Origin');
	if (origin && origin !== new URL(request.url).origin) {
		throw error(403, 'Forbidden');
	}

	if (!locals.user) throw error(401, 'Unauthorized');

	const { app_id, app_name } = (await request.json()) as { app_id: string; app_name: string };
	if (!app_id || !app_name) throw error(400, 'Missing app_id or app_name');

	const db = drizzle(platform!.env.DB, { schema });

	const existing = await db
		.select({ id: schema.app_bookmarks.id })
		.from(schema.app_bookmarks)
		.where(
			and(
				eq(schema.app_bookmarks.account_id, locals.user.id),
				eq(schema.app_bookmarks.app_id, app_id)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		await db.delete(schema.app_bookmarks).where(
			and(
				eq(schema.app_bookmarks.account_id, locals.user.id),
				eq(schema.app_bookmarks.app_id, app_id)
			)
		);
		return json({ bookmarked: false });
	} else {
		await db.insert(schema.app_bookmarks).values({
			account_id: locals.user.id,
			app_id,
			app_name
		});
		return json({ bookmarked: true });
	}
};
