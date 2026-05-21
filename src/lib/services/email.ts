import { z } from 'zod';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { createEmailProvider } from '$lib/server/email/index';
import { CloudflareEmailProvider } from '$lib/server/email/cloudflare';
import {
	welcomeEmail,
	passwordChangedEmail,
	customerMessageEmail,
	adminAlertEmail,
	type AdminAlertEmailData
} from '$lib/server/email/templates';
import { writeAuditLog } from '$lib/server/audit';
import type { ServiceCtx } from './index';

const EmailRateLimit = {
	windowMs: 60_000,
	maxPerWindow: 10
} as const;

// In-process rate limit store (resets on Worker restart).
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
	const now = Date.now();
	const entry = rateLimitStore.get(key);
	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(key, { count: 1, resetAt: now + EmailRateLimit.windowMs });
		return true;
	}
	if (entry.count >= EmailRateLimit.maxPerWindow) return false;
	entry.count++;
	return true;
}

const EmailSchema = z.email();

async function resolveAccountEmail(ctx: ServiceCtx, accountId: string): Promise<{ name: string; email: string }> {
	const [account] = await ctx.db
		.select({ id: schema.accounts.id, name: schema.accounts.name, email: schema.accounts.email })
		.from(schema.accounts)
		.where(eq(schema.accounts.id, accountId))
		.limit(1);

	if (!account) throw new Error(`Account not found: ${accountId}`);
	return account;
}

/**
 * Send a welcome email to a newly created account.
 * Called after createAccount succeeds.
 */
export async function sendWelcomeEmail(
	ctx: ServiceCtx,
	accountId: string,
	loginUrl: string
): Promise<void> {
	const account = await resolveAccountEmail(ctx, accountId);
	const emailResult = EmailSchema.safeParse(account.email);
	if (!emailResult.success) throw new Error(`Invalid account email: ${account.email}`);

	if (!checkRateLimit(`welcome:${accountId}`)) {
		throw new Error('Email rate limit exceeded');
	}

	const provider = createEmailProvider(ctx.env);
	const { subject, html, text } = welcomeEmail({
		name: account.name,
		email: account.email,
		loginUrl
	});

	await provider.send({ to: account.email, subject, html, text });

	await writeAuditLog({
		db: ctx.env.DB,
		account_id: ctx.user.id,
		action: 'create',
		resource_type: 'email',
		resource_id: accountId,
		metadata: { type: 'welcome', to: account.email },
		request: ctx.request
	});
}

/**
 * Notify an account that their password was changed.
 */
export async function sendPasswordChangedEmail(
	ctx: ServiceCtx,
	accountId: string
): Promise<void> {
	const account = await resolveAccountEmail(ctx, accountId);
	const emailResult = EmailSchema.safeParse(account.email);
	if (!emailResult.success) return;

	if (!checkRateLimit(`pwd:${accountId}`)) return;

	const provider = createEmailProvider(ctx.env);
	const changedAt = new Date().toUTCString();
	const { subject, html, text } = passwordChangedEmail({ name: account.name, changedAt });

	await provider.send({ to: account.email, subject, html, text });

	await writeAuditLog({
		db: ctx.env.DB,
		account_id: ctx.user.id,
		action: 'update',
		resource_type: 'email',
		resource_id: accountId,
		metadata: { type: 'password_changed', to: account.email },
		request: ctx.request
	});
}

const MessageSchema = z.object({
	to: z.email(),
	subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
	body: z.string().min(1, 'Message body is required').max(10000, 'Message too long')
});

/**
 * Send a freeform message email to a customer.
 */
export async function sendCustomerMessage(
	ctx: ServiceCtx,
	data: { to: string; subject: string; body: string }
): Promise<{ error?: string }> {
	const r = MessageSchema.safeParse(data);
	if (!r.success) return { error: r.error.issues[0].message };

	if (!ctx.env.EMAIL_FROM) return { error: 'EMAIL_FROM is not configured' };

	if (!checkRateLimit(`msg:${ctx.user.id}`)) return { error: 'Rate limit exceeded, please wait' };

	const provider = createEmailProvider(ctx.env);
	const { subject, html, text } = customerMessageEmail({
		senderName: ctx.user.name,
		subject: r.data.subject,
		body: r.data.body
	});

	await provider.send({ to: r.data.to, subject, html, text });

	await writeAuditLog({
		db: ctx.env.DB,
		account_id: ctx.user.id,
		action: 'create',
		resource_type: 'email',
		resource_id: r.data.to,
		metadata: { type: 'customer_message', subject: r.data.subject },
		request: ctx.request
	});

	return {};
}

/**
 * Resolve the alert provider.
 * Prefers the Cloudflare send_email binding; falls back to the configured HTTP provider.
 */
function createAlertProvider(env: Env, alertTo: string) {
	if (env.SEND_EMAIL) {
		if (!env.EMAIL_FROM) throw new Error('EMAIL_FROM is not configured');
		return new CloudflareEmailProvider(env.SEND_EMAIL, env.EMAIL_FROM, alertTo);
	}
	return createEmailProvider(env);
}

/**
 * Send an alert email to the configured admin address.
 * Prefers the value stored in the settings table over the env var.
 * Uses Cloudflare send_email binding when available, otherwise the HTTP provider.
 */
export async function sendAdminAlert(
	ctx: ServiceCtx,
	data: AdminAlertEmailData
): Promise<void> {
	const [row] = await ctx.db
		.select({ value: schema.settings.value })
		.from(schema.settings)
		.where(eq(schema.settings.key, 'alert_email_to'))
		.limit(1);

	const alertTo = row?.value || ctx.env.ALERT_EMAIL_TO;
	if (!alertTo) return;

	const emailResult = EmailSchema.safeParse(alertTo);
	if (!emailResult.success) return;

	if (!checkRateLimit(`alert:${data.subject}`)) return;

	const provider = createAlertProvider(ctx.env, alertTo);
	const { subject, html, text } = adminAlertEmail(data);

	await provider.send({ to: alertTo, subject, html, text });
}

/**
 * Fire-and-forget admin alert — never throws, safe to call from authenticated handlers.
 */
export function sendAdminAlertSilent(
	ctx: ServiceCtx,
	data: AdminAlertEmailData
): void {
	sendAdminAlert(ctx, data).catch(() => {
		// Intentionally swallowed; alert failure must not break the main flow
	});
}

/**
 * Send an admin alert using only Env — for unauthenticated contexts (e.g. login failures).
 * Never throws.
 */
export function sendAdminAlertFromEnv(env: Env, data: AdminAlertEmailData): void {
	const alertTo = env.ALERT_EMAIL_TO;
	if (!alertTo) return;

	const emailResult = EmailSchema.safeParse(alertTo);
	if (!emailResult.success) return;

	if (!checkRateLimit(`alert:${data.subject}`)) return;

	const provider = createAlertProvider(env, alertTo);
	const { subject, html, text } = adminAlertEmail(data);

	provider.send({ to: alertTo, subject, html, text }).catch(() => {
		// Intentionally swallowed
	});
}
