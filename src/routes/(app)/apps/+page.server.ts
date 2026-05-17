import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { count, desc, eq, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const bookmarkOnly = url.searchParams.get('bookmark') === '1';

	const [appsList, userBookmarks] = await Promise.all([
		db.select().from(schema.apps).orderBy(desc(schema.apps.updated_at)),
		db.select({ app_id: schema.app_bookmarks.app_id })
			.from(schema.app_bookmarks)
			.where(eq(schema.app_bookmarks.account_id, locals.user!.id))
	]);

	const bookmarkedIds = new Set(userBookmarks.map((b) => b.app_id));

	const filtered = bookmarkOnly
		? appsList.filter((a) => bookmarkedIds.has(a.id))
		: appsList;

	const recordCounts: Record<string, number> = {};
	if (filtered.length > 0) {
		const ids = filtered.map((a) => a.id);
		const rows = await db
			.select({ app_id: schema.app_records.app_id, count: count() })
			.from(schema.app_records)
			.where(sql`${schema.app_records.app_id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
			.groupBy(schema.app_records.app_id);
		for (const row of rows) recordCounts[row.app_id] = row.count;
	}

	return {
		apps: filtered.map((a) => ({
			...a,
			field_count: (JSON.parse(a.fields) as unknown[]).length,
			record_count: recordCounts[a.id] ?? 0,
			bookmarked: bookmarkedIds.has(a.id)
		})),
		bookmarkOnly
	};
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'App name is required' });

		const db = drizzle(platform!.env.DB, { schema });
		const [app] = await db
			.insert(schema.apps)
			.values({ name, description: data.get('description')?.toString().trim() || '' })
			.returning();

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'create',
			resource_type: 'app',
			resource_id: app.id,
			request
		});

		return { success: true, id: app.id };
	},

	delete: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.apps).where(eq(schema.apps.id, id));

		await writeAuditLog({
			db: platform!.env.DB,
			account_id: locals.user!.id,
			action: 'delete',
			resource_type: 'app',
			resource_id: id,
			request
		});

		return { success: true };
	}
} satisfies Actions;
