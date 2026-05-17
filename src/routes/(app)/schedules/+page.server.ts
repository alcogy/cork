import type { PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, desc, eq, gte } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const view = url.searchParams.get('view') || 'upcoming';

	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

	const [upcoming, past] = await Promise.all([
		db.query.customer_schedules.findMany({
			where: gte(schema.customer_schedules.start_at, now),
			orderBy: [asc(schema.customer_schedules.start_at)],
			limit: 50,
			with: { customer: true, account: true }
		}),
		view === 'past'
			? db.query.customer_schedules.findMany({
					orderBy: [desc(schema.customer_schedules.start_at)],
					limit: 50,
					with: { customer: true, account: true }
				})
			: Promise.resolve([])
	]);

	return { upcoming, past, view };
};
