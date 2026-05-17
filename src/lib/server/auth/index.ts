import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { RequestEvent } from '@sveltejs/kit';

type CookieSerializeOptions = Parameters<RequestEvent['cookies']['set']>[2];

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-256';

export const SESSION_COOKIE_OPTIONS: CookieSerializeOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: true,
	maxAge: 60 * 60 * 24 * 7 // 7 days
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
	return toHex(derived) === hashHex;
}

export async function getSession(event: RequestEvent) {
	const sessionId = event.cookies.get('session');
	if (!sessionId) return null;

	const db = drizzle(event.platform!.env.DB, { schema });
	const account = await db.query.accounts.findFirst({
		where: eq(schema.accounts.id, sessionId)
	});

	return account ?? null;
}

export function validatePasswordStrength(password: string): string | null {
	if (password.length < 8) return 'Password must be at least 8 characters';
	return null;
}
