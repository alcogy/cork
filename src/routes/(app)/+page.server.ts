import type { PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });

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

	const [recentActivities, upcomingSchedules, recentProjects, pendingApprovals] = await Promise.all(
		[
			db.query.customer_activities.findMany({
				orderBy: [desc(schema.customer_activities.occurred_at)],
				limit: 5,
				with: { customer: true, account: true }
			}),
			db.query.customer_schedules.findMany({
				where: eq(schema.customer_schedules.account_id, locals.user!.id),
				orderBy: [schema.customer_schedules.start_at],
				limit: 10,
				with: { customer: true }
			}),
			db.query.projects.findMany({
				orderBy: [desc(schema.projects.updated_at)],
				limit: 5,
				with: { status: true }
			}),
			db.query.workflows.findMany({
				where: eq(schema.workflows.current_approver_id, locals.user!.id),
				orderBy: [desc(schema.workflows.created_at)],
				limit: 5,
				with: { requester: true }
			})
		]
	);

	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

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
		upcomingSchedules: upcomingSchedules.filter((s) => s.start_at >= now).slice(0, 5),
		recentProjects,
		pendingApprovals
	};
};
