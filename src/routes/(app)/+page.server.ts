import type { PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { asc, desc, eq, gte, lt, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = drizzle(platform!.env.DB, { schema });
	const scheduleView = url.searchParams.get('schedules') === 'past' ? 'past' : 'upcoming';

	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

	const [
		[customersCount],
		[activitiesCount],
		[schedulesCount],
		[projectsCount],
		[workflowsCount],
		[wbsCount],
		[appsCount]
	] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(schema.customers),
		db.select({ count: sql<number>`count(*)` }).from(schema.customer_activities),
		db.select({ count: sql<number>`count(*)` }).from(schema.customer_schedules),
		db.select({ count: sql<number>`count(*)` }).from(schema.projects),
		db.select({ count: sql<number>`count(*)` }).from(schema.workflows),
		db.select({ count: sql<number>`count(*)` }).from(schema.wbs),
		db.select({ count: sql<number>`count(*)` }).from(schema.apps)
	]);

	const [recentActivities, schedules, recentProjects, pendingApprovals] = await Promise.all([
		db.query.customer_activities.findMany({
			orderBy: [desc(schema.customer_activities.occurred_at)],
			limit: 5,
			with: { customer: true, account: true }
		}),
		scheduleView === 'upcoming'
			? db.query.customer_schedules.findMany({
					where: gte(schema.customer_schedules.start_at, now),
					orderBy: [asc(schema.customer_schedules.start_at)],
					limit: 8,
					with: { customer: true, account: true }
				})
			: db.query.customer_schedules.findMany({
					where: lt(schema.customer_schedules.start_at, now),
					orderBy: [desc(schema.customer_schedules.start_at)],
					limit: 8,
					with: { customer: true, account: true }
				}),
		db.query.projects.findMany({
			orderBy: [desc(schema.projects.updated_at)],
			limit: 5,
			with: { status: true }
		}),
		db.query.workflow_approvals.findMany({
			where: eq(schema.workflow_approvals.approver_id, locals.user!.id),
			with: {
				workflow: { with: { requester: true } }
			},
			limit: 5
		}).then((rows) => rows.filter((r) => r.status === 'pending'))
	]);

	return {
		stats: {
			customers: customersCount.count,
			activities: activitiesCount.count,
			schedules: schedulesCount.count,
			projects: projectsCount.count,
			workflows: workflowsCount.count,
			wbs: wbsCount.count,
			apps: appsCount.count
		},
		recentActivities,
		schedules,
		scheduleView,
		recentProjects,
		pendingApprovals
	};
};
