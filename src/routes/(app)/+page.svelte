<script lang="ts">
	import { Card } from '$lib/ui';
	import { ACTIVITY_TYPE_LABELS } from '$lib/domain/customer/types';
	import {
		Users,
		Activity,
		CalendarDays,
		FolderKanban,
		CheckSquare,
		GanttChartSquare,
		AppWindow
	} from '@lucide/svelte';
	import { formatDateTime, formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{ label: 'Customers', value: data.stats.customers, icon: Users, color: 'blue' },
		{ label: 'Activities', value: data.stats.activities, icon: Activity, color: 'green' },
		{ label: 'Schedules', value: data.stats.schedules, icon: CalendarDays, color: 'orange' },
		{ label: 'Projects', value: data.stats.projects, icon: FolderKanban, color: 'purple' },
		{ label: 'Approvals', value: data.stats.workflows, icon: CheckSquare, color: 'teal' },
		{ label: 'WBS Projects', value: data.stats.wbs, icon: GanttChartSquare, color: 'red' },
		{ label: 'Apps', value: data.stats.apps, icon: AppWindow, color: 'indigo' }
	]);
</script>

<svelte:head>
	<title>Dashboard — Cork</title>
</svelte:head>

<div class="dashboard">
	<h1 class="page-title">Dashboard</h1>

	<div class="stats-grid">
		{#each stats as stat (stat.label)}
			<div class="stat-card">
				<div class="stat-icon {stat.color}"><stat.icon size={20} /></div>
				<div class="stat-info">
					<span class="stat-value">{stat.value}</span>
					<span class="stat-label">{stat.label}</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="content-grid">
		<Card title="Recent Activities">
			{#if data.recentActivities.length > 0}
				<div class="list">
					{#each data.recentActivities as activity (activity.id)}
						<a href="/customers/{activity.customer_id}" class="list-item">
							<div class="list-main">
								<div class="list-title">{activity.customer?.name ?? 'Unknown'}</div>
								<div class="list-meta">
									<span
										>{ACTIVITY_TYPE_LABELS[
											activity.type as keyof typeof ACTIVITY_TYPE_LABELS
										] ?? activity.type}</span
									>
									<span>· {activity.account?.name ?? 'Unknown'}</span>
								</div>
								{#if activity.note}
									<div class="list-note">{activity.note}</div>
								{/if}
							</div>
							<div class="list-date">{formatDateTime(activity.occurred_at)}</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="empty">No activities yet.</p>
			{/if}
		</Card>

		<Card title="Upcoming Schedules">
			{#if data.upcomingSchedules.length > 0}
				<div class="list">
					{#each data.upcomingSchedules as schedule (schedule.id)}
						<a href="/customers/{schedule.customer_id}" class="list-item">
							<div class="list-main">
								<div class="list-title">{schedule.title}</div>
								<div class="list-meta">
									<span>{schedule.customer?.name ?? 'Unknown'}</span>
								</div>
							</div>
							<div class="list-date">{formatDate(schedule.start_at)}</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="empty">No upcoming schedules.</p>
			{/if}
		</Card>

		<Card title="Recent Projects">
			{#if data.recentProjects.length > 0}
				<div class="list">
					{#each data.recentProjects as project (project.id)}
						<a href="/projects/{project.id}" class="list-item">
							<div class="list-main">
								<div class="list-title">{project.title}</div>
								{#if project.status}
									<div class="list-meta">
										<span
											class="status-dot"
											style="background-color: {project.status.color}"
										></span>
										<span>{project.status.label}</span>
									</div>
								{/if}
							</div>
							<div class="list-date">{formatDate(project.updated_at)}</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="empty">No projects yet.</p>
			{/if}
		</Card>

		<Card title="Pending Approvals">
			{#if data.pendingApprovals.length > 0}
				<div class="list">
					{#each data.pendingApprovals as workflow (workflow.id)}
						<a href="/workflows/{workflow.id}" class="list-item">
							<div class="list-main">
								<div class="list-title">{workflow.title}</div>
								<div class="list-meta">
									<span>from {workflow.requester?.name ?? 'Unknown'}</span>
								</div>
							</div>
							<div class="list-date">{formatDate(workflow.created_at)}</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="empty">No pending approvals.</p>
			{/if}
		</Card>
	</div>
</div>

<style lang="scss">
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xl);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--space-lg);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		flex-shrink: 0;

		&.blue {
			background-color: #dbeafe;
			color: #1d4ed8;
		}
		&.green {
			background-color: #dcfce7;
			color: #15803d;
		}
		&.orange {
			background-color: #ffedd5;
			color: #c2410c;
		}
		&.purple {
			background-color: #ede9fe;
			color: #7c3aed;
		}
		&.teal {
			background-color: #ccfbf1;
			color: #0f766e;
		}
		&.red {
			background-color: #fee2e2;
			color: #dc2626;
		}
		&.indigo {
			background-color: #e0e7ff;
			color: #4338ca;
		}
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
		color: var(--color-text);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-top: 2px;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: var(--space-lg);

		@media (max-width: 640px) {
			grid-template-columns: 1fr;
		}
	}

	.list {
		display: flex;
		flex-direction: column;
	}

	.list-item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md) 0;
		border-bottom: 1px solid var(--color-border-light);
		color: var(--color-text);
		text-decoration: none;

		&:last-child {
			border-bottom: none;
		}

		&:hover {
			color: var(--color-primary);
		}
	}

	.list-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.list-title {
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.list-meta {
		display: flex;
		gap: var(--space-xs);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.list-note {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 280px;
	}

	.list-date {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.empty {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		padding: var(--space-lg) 0;
		text-align: center;
	}
</style>
