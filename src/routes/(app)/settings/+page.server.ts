import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { CloudflareEmailProvider } from '$lib/server/email/cloudflare';
import { createEmailProvider } from '$lib/server/email/index';
import { adminAlertEmail } from '$lib/server/email/templates';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Forbidden');

	const db = drizzle(platform!.env.DB, { schema });

	const [settings, projectStatuses, projectCategories, workflowCategories] = await Promise.all([
		db.select().from(schema.settings),
		db.select().from(schema.project_statuses).orderBy(schema.project_statuses.display_order),
		db.select().from(schema.project_categories).orderBy(schema.project_categories.display_order),
		db.select().from(schema.workflow_categories)
	]);

	const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
	const hasEmailBinding = Boolean(platform!.env.SEND_EMAIL);

	return { settingsMap, projectStatuses, projectCategories, workflowCategories, hasEmailBinding };
};

export const actions = {
	saveSetting: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const key = data.get('key')?.toString();
		const value = data.get('value')?.toString() ?? '';

		if (!key) return fail(400, { error: 'Key is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.settings).values({ key, value })
			.onConflictDoUpdate({ target: schema.settings.key, set: { value } });

		return { success: true };
	},

	addProjectStatus: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const label = data.get('label')?.toString().trim();
		if (!label) return fail(400, { error: 'Label is required' });

		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_statuses).values({
			label,
			color: data.get('color')?.toString() || '#94a3b8',
			display_order: 999
		});
		return { success: true };
	},

	deleteProjectStatus: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.project_statuses).where(eq(schema.project_statuses.id, id));
		return { success: true };
	},

	addProjectCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const label = data.get('label')?.toString().trim();
		if (!label) return fail(400, { error: 'Label is required' });
		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.project_categories).values({ label, display_order: 999 });
		return { success: true };
	},

	deleteProjectCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.project_categories).where(eq(schema.project_categories.id, id));
		return { success: true };
	},

	addWorkflowCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const label = data.get('label')?.toString().trim();
		if (!label) return fail(400, { error: 'Label is required' });
		const db = drizzle(platform!.env.DB, { schema });
		await db.insert(schema.workflow_categories).values({
			label,
			color: data.get('color')?.toString() || '#6b7280'
		});
		return { success: true };
	},

	deleteWorkflowCategory: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Invalid request' });
		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.workflow_categories).where(eq(schema.workflow_categories.id, id));
		return { success: true };
	},

	sendTestEmail: async ({ platform, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		if (!platform!.env.SEND_EMAIL) {
			return fail(503, { error: 'Cloudflare Email binding (SEND_EMAIL) is not configured' });
		}

		const db = drizzle(platform!.env.DB, { schema });
		const [row] = await db
			.select({ value: schema.settings.value })
			.from(schema.settings)
			.where(eq(schema.settings.key, 'alert_email_to'))
			.limit(1);

		const alertTo = row?.value || platform!.env.ALERT_EMAIL_TO;
		if (!alertTo) return fail(400, { error: 'No alert email address configured' });

		const emailResult = z.email().safeParse(alertTo);
		if (!emailResult.success) return fail(400, { error: 'Invalid email address' });

		const from = platform!.env.EMAIL_FROM;
		if (!from) return fail(400, { error: 'EMAIL_FROM is not configured' });
		const provider = new CloudflareEmailProvider(platform!.env.SEND_EMAIL, from, alertTo);

		try {
			const { subject, html, text } = adminAlertEmail({
				subject: 'Cork — Test Alert Email',
				severity: 'info',
				summary: 'This is a test email from Cork. If you received this, your email notification settings are configured correctly.',
				details: {
					'Sent by': locals.user!.name,
					'Recipient': alertTo,
					'Sent at': new Date().toUTCString()
				}
			});
			await provider.send({ to: alertTo, subject, html, text });
			return { success: true, testEmailSent: true, sentTo: alertTo };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Failed to send test email' });
		}
	}
} satisfies Actions;
