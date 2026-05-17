<script lang="ts">
	import { CalendarDays, Clock, User } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { formatDate, formatDateTime } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let view = $state(data.view);

	function navigate(v: string) {
		view = v;
		goto(`?view=${v}`, { keepFocus: true });
	}
</script>

<svelte:head>
	<title>Schedules — Limerick</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Schedules</h1>
		<div class="view-tabs">
			<button class="view-tab {view === 'upcoming' ? 'active' : ''}" onclick={() => navigate('upcoming')}>
				Upcoming
			</button>
			<button class="view-tab {view === 'past' ? 'active' : ''}" onclick={() => navigate('past')}>
				Past
			</button>
		</div>
	</div>

	{#if view === 'upcoming'}
		{#if data.upcoming.length > 0}
			<div class="schedule-list">
				{#each data.upcoming as schedule (schedule.id)}
					<a href="/customers/{schedule.customer_id}" class="schedule-card">
						<div class="schedule-date-block">
							<div class="schedule-month">{new Date(schedule.start_at).toLocaleDateString('en-US', { month: 'short' })}</div>
							<div class="schedule-day">{new Date(schedule.start_at).getDate()}</div>
						</div>
						<div class="schedule-body">
							<div class="schedule-title">{schedule.title}</div>
							<div class="schedule-meta">
								<span class="meta-item"><User size={12} /> {schedule.account?.name ?? '—'}</span>
								<span class="meta-item"><CalendarDays size={12} /> {schedule.customer?.name ?? '—'}</span>
								<span class="meta-item"><Clock size={12} /> {formatDateTime(schedule.start_at)}</span>
							</div>
							{#if schedule.note}
								<div class="schedule-note">{schedule.note}</div>
							{/if}
						</div>
						{#if schedule.end_at}
							<div class="schedule-end">→ {formatDate(schedule.end_at)}</div>
						{/if}
					</a>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<CalendarDays size={40} />
				<p>No upcoming schedules.</p>
				<p class="empty-hint">Add schedules from a customer's detail page.</p>
			</div>
		{/if}
	{:else}
		{#if data.past.length > 0}
			<div class="schedule-list past">
				{#each data.past as schedule (schedule.id)}
					<a href="/customers/{schedule.customer_id}" class="schedule-card">
						<div class="schedule-date-block">
							<div class="schedule-month">{new Date(schedule.start_at).toLocaleDateString('en-US', { month: 'short' })}</div>
							<div class="schedule-day">{new Date(schedule.start_at).getDate()}</div>
						</div>
						<div class="schedule-body">
							<div class="schedule-title">{schedule.title}</div>
							<div class="schedule-meta">
								<span class="meta-item"><User size={12} /> {schedule.account?.name ?? '—'}</span>
								<span class="meta-item"><CalendarDays size={12} /> {schedule.customer?.name ?? '—'}</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>No past schedules.</p>
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-xl); }

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.page-title { font-size: 1.5rem; font-weight: 700; }

	.view-tabs {
		display: flex;
		gap: 2px;
		background-color: var(--color-bg-sunken);
		padding: 3px;
		border-radius: var(--radius-md);
	}

	.view-tab {
		padding: var(--space-xs) var(--space-lg);
		border: none;
		background: none;
		border-radius: calc(var(--radius-md) - 2px);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);

		&.active {
			background-color: var(--color-bg-elevated);
			color: var(--color-text);
			box-shadow: var(--shadow-sm);
		}
	}

	.schedule-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&.past {
			opacity: 0.7;
		}
	}

	.schedule-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-lg);
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text);
		transition: border-color var(--transition-fast);

		&:hover { border-color: var(--color-primary); }
	}

	.schedule-date-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 48px;
		padding: var(--space-xs) var(--space-sm);
		background-color: var(--color-primary-light);
		border-radius: var(--radius-md);
		flex-shrink: 0;
	}

	.schedule-month {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-primary);
		text-transform: uppercase;
	}

	.schedule-day {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-primary);
		line-height: 1;
	}

	.schedule-body { flex: 1; min-width: 0; }
	.schedule-title { font-weight: 500; margin-bottom: var(--space-xs); }

	.schedule-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.schedule-note {
		margin-top: var(--space-xs);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.schedule-end {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-3xl);
		text-align: center;
		color: var(--color-text-tertiary);
	}

	.empty-hint {
		font-size: 0.8125rem;
	}
</style>
