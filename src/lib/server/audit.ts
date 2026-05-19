import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';

type AuditAction =
	| 'create'
	| 'update'
	| 'delete'
	| 'login'
	| 'login_failed'
	| 'logout'
	| 'export'
	| 'import';

interface AuditOptions {
	db: D1Database;
	account_id: string | null;
	action: AuditAction;
	resource_type: string;
	resource_id?: string;
	metadata?: Record<string, unknown>;
	request?: Request;
}

function sanitizeHeader(value: string | null, maxLen: number): string | null {
	if (!value) return null;
	// Strip control characters (0x00–0x1F, 0x7F)
	return value.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen);
}

export async function writeAuditLog(opts: AuditOptions): Promise<void> {
	const orm = drizzle(opts.db, { schema });

	await orm.insert(schema.audit_logs).values({
		account_id: opts.account_id,
		action: opts.action,
		resource_type: opts.resource_type,
		resource_id: opts.resource_id ?? null,
		metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
		ip_address: sanitizeHeader(
			opts.request?.headers.get('CF-Connecting-IP') ?? null,
			45 // max IPv6 length
		),
		user_agent: sanitizeHeader(opts.request?.headers.get('User-Agent') ?? null, 512)
	});
}
