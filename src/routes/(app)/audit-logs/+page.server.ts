import { error } from '@sveltejs/kit';
import { desc, count, eq, and, like, type SQL } from 'drizzle-orm';
import { makeCtx } from '$lib/services';
import * as schema from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const PER_PAGE = 50;

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const ctx = makeCtx(platform!, locals);
	if (ctx.user.role !== 'admin') throw error(403, 'Forbidden');

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const filterAction = url.searchParams.get('action') ?? '';
	const filterResource = url.searchParams.get('resource') ?? '';
	const filterUser = url.searchParams.get('user') ?? '';

	const conditions: SQL[] = [];
	if (filterAction) conditions.push(eq(schema.audit_logs.action, filterAction as never));
	if (filterResource) conditions.push(eq(schema.audit_logs.resource_type, filterResource));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	// When filtering by user name we need a subquery via the accounts join.
	// Drizzle D1 doesn't support correlated subqueries well, so we do two queries:
	// one to get matching account IDs, then filter by account_id.
	let accountIds: string[] | null = null;
	if (filterUser) {
		const matched = await ctx.db
			.select({ id: schema.accounts.id })
			.from(schema.accounts)
			.where(like(schema.accounts.name, `%${filterUser}%`));
		accountIds = matched.map((a) => a.id);
	}

	const buildWhere = () => {
		const conds = [...(conditions)];
		if (accountIds !== null) {
			if (accountIds.length === 0) return eq(schema.audit_logs.id, '__no_match__');
			// SQLite IN via OR
			const idConds = accountIds.map((id) => eq(schema.audit_logs.account_id, id));
			conds.push(idConds.length === 1 ? idConds[0] : and(...idConds)!);
		}
		return conds.length > 0 ? and(...conds) : undefined;
	};

	const finalWhere = buildWhere();

	const [countResult, logs] = await Promise.all([
		ctx.db.select({ count: count() }).from(schema.audit_logs).where(finalWhere),
		ctx.db
			.select({
				id: schema.audit_logs.id,
				action: schema.audit_logs.action,
				resource_type: schema.audit_logs.resource_type,
				resource_id: schema.audit_logs.resource_id,
				metadata: schema.audit_logs.metadata,
				ip_address: schema.audit_logs.ip_address,
				user_agent: schema.audit_logs.user_agent,
				created_at: schema.audit_logs.created_at,
				account_name: schema.accounts.name
			})
			.from(schema.audit_logs)
			.leftJoin(schema.accounts, eq(schema.audit_logs.account_id, schema.accounts.id))
			.where(finalWhere)
			.orderBy(desc(schema.audit_logs.created_at))
			.limit(PER_PAGE)
			.offset((page - 1) * PER_PAGE)
	]);

	return {
		logs,
		total: countResult[0]?.count ?? 0,
		page,
		totalPages: Math.ceil((countResult[0]?.count ?? 0) / PER_PAGE),
		perPage: PER_PAGE,
		filterAction,
		filterResource,
		filterUser
	};
};
