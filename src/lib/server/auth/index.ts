import { drizzle } from 'drizzle-orm/d1';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { RequestEvent } from '@sveltejs/kit';

type CookieSerializeOptions = Parameters<RequestEvent['cookies']['set']>[2];

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-256';
const SESSION_DAYS = 7;

export const SESSION_COOKIE_OPTIONS: CookieSerializeOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: true,
	maxAge: 60 * 60 * 24 * SESSION_DAYS
} as const;

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

// Constant-time comparison via HMAC to prevent timing attacks
async function timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): Promise<boolean> {
	if (a.byteLength !== b.byteLength) return false;
	const key = await crypto.subtle.importKey(
		'raw',
		crypto.getRandomValues(new Uint8Array(32)),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const [macA, macB] = await Promise.all([
		crypto.subtle.sign('HMAC', key, a),
		crypto.subtle.sign('HMAC', key, b)
	]);
	const va = new Uint8Array(macA);
	const vb = new Uint8Array(macB);
	let diff = 0;
	for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
	return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		ALGORITHM,
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: ALGORITHM, hash: HASH, salt, iterations: ITERATIONS },
		key,
		KEY_LENGTH * 8
	);
	return `${toHex(salt.buffer as ArrayBuffer)}:${toHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const salt = fromHex(saltHex).buffer as ArrayBuffer;
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		ALGORITHM,
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: ALGORITHM, hash: HASH, salt, iterations: ITERATIONS },
		key,
		KEY_LENGTH * 8
	);
	return timingSafeEqual(derived, fromHex(hashHex).buffer as ArrayBuffer);
}

export async function createSession(db: D1Database, accountId: string): Promise<string> {
	const orm = drizzle(db, { schema });
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
		.toISOString()
		.replace('T', ' ')
		.slice(0, 19);
	const [session] = await orm
		.insert(schema.sessions)
		.values({ account_id: accountId, expires_at: expiresAt })
		.returning();
	return session.id;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
	const orm = drizzle(db, { schema });
	await orm.delete(schema.sessions).where(eq(schema.sessions.id, token));
}

export async function deleteAllSessions(db: D1Database, accountId: string): Promise<void> {
	const orm = drizzle(db, { schema });
	await orm.delete(schema.sessions).where(eq(schema.sessions.account_id, accountId));
}

export async function getSession(event: RequestEvent) {
	const token = event.cookies.get('session');
	if (!token) return null;

	const db = drizzle(event.platform!.env.DB, { schema });
	const session = await db.query.sessions.findFirst({
		where: and(
			eq(schema.sessions.id, token),
			sql`${schema.sessions.expires_at} > datetime('now')`
		),
		with: { account: true }
	});

	return session?.account ?? null;
}

export function validatePasswordStrength(password: string): string | null {
	if (password.length < 8) return 'Password must be at least 8 characters';
	return null;
}
