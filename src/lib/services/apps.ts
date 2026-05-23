import { z } from 'zod';
import { error, fail, redirect } from '@sveltejs/kit';
import { count, desc, eq, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { writeAuditLog } from '$lib/server/audit';
import type { AppDef, AppField } from '$lib/types/apps';
import type { ServiceCtx } from './index';

const CreateAppSchema = z.object({
	name: z.string().min(1, 'App name is required').max(100, 'Name too long'),
	description: z.string().max(1000, 'Description too long').optional()
});

const SaveAppDefSchema = z.object({
	name: z.string().min(1, 'App name is required').max(100, 'Name too long'),
	description: z.string().max(1000, 'Description too long'),
	fields: z.string().min(1, 'Fields are required').max(50000, 'Field definition too large')
});

export async function listApps(ctx: ServiceCtx, opts: { bookmarkOnly: boolean }) {
	const { db, user } = ctx;
	const { bookmarkOnly } = opts;

	const [appsList, userBookmarks] = await Promise.all([
		db.select().from(schema.apps).orderBy(desc(schema.apps.updated_at)),
		db
			.select({ app_id: schema.app_bookmarks.app_id })
			.from(schema.app_bookmarks)
			.where(eq(schema.app_bookmarks.account_id, user.id))
	]);

	const bookmarkedIds = new Set(userBookmarks.map((b) => b.app_id));
	const filtered = bookmarkOnly ? appsList.filter((a) => bookmarkedIds.has(a.id)) : appsList;

	const recordCounts: Record<string, number> = {};
	if (filtered.length > 0) {
		const ids = filtered.map((a) => a.id);
		const rows = await db
			.select({ app_id: schema.app_records.app_id, count: count() })
			.from(schema.app_records)
			.where(
				sql`${schema.app_records.app_id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
			)
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
}

export async function getApp(ctx: ServiceCtx, id: string) {
	const { db } = ctx;
	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, id) });
	if (!app) throw error(404, 'App not found');

	const fields: AppField[] = JSON.parse(app.fields);
	const records = await db.query.app_records.findMany({
		where: eq(schema.app_records.app_id, id),
		orderBy: [desc(schema.app_records.created_at)],
		with: { creator: true }
	});

	return {
		app: { ...app, fieldsParsed: fields },
		records: records.map((r) => ({ ...r, dataParsed: JSON.parse(r.data) as Record<string, unknown> }))
	};
}

export async function getAppDef(ctx: ServiceCtx, id: string): Promise<{ app: AppDef }> {
	const { db, user } = ctx;
	if (user.role !== 'admin') throw redirect(303, `/apps/${id}`);

	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, id) });
	if (!app) throw error(404, 'App not found');

	const fields: AppField[] = JSON.parse(app.fields);
	return {
		app: {
			id: app.id,
			name: app.name,
			description: app.description,
			fields,
			is_published: app.is_published,
			created_at: app.created_at,
			updated_at: app.updated_at
		}
	};
}

export async function createApp(ctx: ServiceCtx, data: unknown) {
	const { db, env, user, request } = ctx;

	const r = CreateAppSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	const [app] = await db
		.insert(schema.apps)
		.values({ name: r.data.name, description: r.data.description ?? '' })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'app',
		resource_id: app.id,
		request
	});
	return { success: true, id: app.id };
}

export async function deleteApp(ctx: ServiceCtx, id: string) {
	const { db, env, user, request } = ctx;
	if (!id) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.apps).where(eq(schema.apps.id, id));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'app',
		resource_id: id,
		request
	});
	return { success: true };
}

export async function createRecord(ctx: ServiceCtx, appId: string, formData: FormData) {
	const { db, env, user, request } = ctx;
	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, appId) });
	if (!app) return fail(404, { error: 'App not found' });

	const fields: AppField[] = JSON.parse(app.fields);
	const data: Record<string, unknown> = {};

	for (const field of fields) {
		let val: string;
		if (field.type === 'checkbox' && field.options && field.options.length > 0) {
			val = formData.getAll(field.id).map(String).join(', ');
		} else {
			val = formData.get(field.id)?.toString() ?? '';
		}
		if (field.required && !val) return fail(400, { error: `${field.label} is required` });
		data[field.id] = val;
	}

	const [record] = await db
		.insert(schema.app_records)
		.values({ app_id: appId, data: JSON.stringify(data), created_by: user.id })
		.returning();

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'create',
		resource_type: 'app_record',
		resource_id: record.id,
		request
	});
	return { success: true };
}

export async function getRecord(ctx: ServiceCtx, appId: string, recordId: string) {
	const { db } = ctx;
	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, appId) });
	if (!app) throw error(404, 'App not found');

	const record = await db.query.app_records.findFirst({
		where: eq(schema.app_records.id, recordId),
		with: { creator: true }
	});
	if (!record) throw error(404, 'Record not found');

	const fields: AppField[] = JSON.parse(app.fields);
	return {
		app: { ...app, fieldsParsed: fields },
		record: { ...record, dataParsed: JSON.parse(record.data) as Record<string, unknown> }
	};
}

export async function updateRecord(
	ctx: ServiceCtx,
	appId: string,
	recordId: string,
	formData: FormData
) {
	const { db, env, user, request } = ctx;
	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, appId) });
	if (!app) return fail(404, { error: 'App not found' });

	const fields: AppField[] = JSON.parse(app.fields);
	const data: Record<string, unknown> = {};

	for (const field of fields) {
		let val: string;
		if (field.type === 'checkbox' && field.options && field.options.length > 0) {
			val = formData.getAll(field.id).map(String).join(', ');
		} else {
			val = formData.get(field.id)?.toString() ?? '';
		}
		if (field.required && !val) return fail(400, { error: `${field.label} is required` });
		data[field.id] = val;
	}

	await db
		.update(schema.app_records)
		.set({
			data: JSON.stringify(data),
			updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
		})
		.where(eq(schema.app_records.id, recordId));

	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'update',
		resource_type: 'app_record',
		resource_id: recordId,
		request
	});
	return { success: true };
}

export async function deleteRecord(ctx: ServiceCtx, recordId: string) {
	const { db, env, user, request } = ctx;
	if (!recordId) return fail(400, { error: 'Invalid request' });
	await db.delete(schema.app_records).where(eq(schema.app_records.id, recordId));
	await writeAuditLog({
		db: env.DB,
		account_id: user.id,
		action: 'delete',
		resource_type: 'app_record',
		resource_id: recordId,
		request
	});
	return { success: true };
}

export async function togglePublish(ctx: ServiceCtx, appId: string) {
	const { db } = ctx;
	const app = await db.query.apps.findFirst({ where: eq(schema.apps.id, appId) });
	if (!app) return fail(404, { error: 'App not found' });
	await db
		.update(schema.apps)
		.set({ is_published: !app.is_published })
		.where(eq(schema.apps.id, appId));
	return { success: true };
}

export async function saveAppDefinition(ctx: ServiceCtx, appId: string, data: unknown) {
	const r = SaveAppDefSchema.safeParse(data);
	if (!r.success) return fail(400, { error: r.error.issues[0].message });

	await ctx.db
		.update(schema.apps)
		.set({
			name: r.data.name,
			description: r.data.description,
			fields: r.data.fields,
			updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
		})
		.where(eq(schema.apps.id, appId));
	return { success: true };
}

export async function deleteAppAdmin(ctx: ServiceCtx, appId: string) {
	const { db, user } = ctx;
	if (user.role !== 'admin') throw error(403, 'Forbidden');
	await db.delete(schema.apps).where(eq(schema.apps.id, appId));
	throw redirect(303, '/apps');
}
