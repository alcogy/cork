import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	let bookmarks: { app_id: string; app_name: string }[] = [];

	if (locals.user && platform) {
		const db = drizzle(platform.env.DB, { schema });
		bookmarks = await db
			.select({ app_id: schema.app_bookmarks.app_id, app_name: schema.app_bookmarks.app_name })
			.from(schema.app_bookmarks)
			.where(eq(schema.app_bookmarks.account_id, locals.user.id))
			.orderBy(schema.app_bookmarks.app_name);
	}

	return { user: locals.user, locale: locals.locale, bookmarks };
};
