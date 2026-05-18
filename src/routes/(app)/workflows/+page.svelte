<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Modal, Input, Label, Textarea } from '$lib/ui';
	import { WORKFLOW_STATUS_LABELS, WORKFLOW_STATUSES, WORKFLOW_PRIORITIES, WORKFLOW_PRIORITY_LABELS } from '$lib/domain/workflow/types';
	import { Plus } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state(untrack(() => data.statusFilter || 'all'));
	let showEditor = $state(false);
	let saving = $state(false);

	function navigate() {
		const params = new URLSearchParams();
		if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	const statusColor: Record<string, string> = {
		draft: 'neutral',
		submitted: 'info',
		in_review: 'warning',
		approved: 'success',
		rejected: 'danger',
		cancelled: 'neutral'
	};
</script>

<svelte:head>
	<title>{t().workflow.title} — Cork</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t().workflow.title}</h1>
		<Button variant="primary" size="sm" onclick={() => (showEditor = true)}>
			<Plus size={14} /> {t().workflow.new}
		</Button>
	</div>

	<div class="filters">
		<select class="status-select" bind:value={statusFilter} onchange={navigate} aria-label="Filter by status">
			<option value="all">{t().common.all}</option>
			{#each WORKFLOW_STATUSES as s (s)}
				<option value={s}>{WORKFLOW_STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</div>

	{#if data.workflows.length > 0}
		<div class="workflow-list">
			{#each data.workflows as wf (wf.id)}
				<a href="/workflows/{wf.id}" class="workflow-card">
					<div class="workflow-main">
						<div class="workflow-title">{wf.title}</div>
						<div class="workflow-meta">
							<span>by {wf.requester?.name ?? 'Unknown'}</span>
							{#if wf.category}
								<span>· {wf.category.label}</span>
							{/if}
							<span>· {formatDate(wf.created_at)}</span>
						</div>
					</div>
					<span class="status-badge badge-{statusColor[wf.status] ?? 'neutral'}">
						{WORKFLOW_STATUS_LABELS[wf.status]}
					</span>
				</a>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<p>{t().workflow.noRequests}</p>
		</div>
	{/if}
</div>

<Modal open={showEditor} title={t().workflow.new} onclose={() => (showEditor = false)}>
	<form method="POST" action="?/create" use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			await invalidateAll();
			showEditor = false;
			saving = false;
		};
	}}>
		<div class="form-fields">
			<div class="field">
				<Label for="title" required>{t().workflow.requestTitle}</Label>
				<Input id="title" name="title" required />
			</div>
			<div class="field">
				<Label for="description">{t().workflow.description}</Label>
				<Textarea id="description" name="description" rows={3} />
			</div>
			<div class="field">
				<Label for="priority">{t().workflow.priority}</Label>
				<select id="priority" name="priority" class="select-input">
					{#each WORKFLOW_PRIORITIES as p (p)}
						<option value={p} selected={p === 'normal'}>{WORKFLOW_PRIORITY_LABELS[p]}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEditor = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().workflow.new}</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-lg); }
	.page-header { display: flex; align-items: center; justify-content: space-between; }
	.page-title { font-size: 1.5rem; font-weight: 700; }
	.filters { display: flex; gap: var(--space-md); }

	.status-select {
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.8125rem;
	}

	.workflow-list { display: flex; flex-direction: column; gap: var(--space-sm); }

	.workflow-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text);

		&:hover { border-color: var(--color-primary); }
	}

	.workflow-title { font-weight: 500; }
	.workflow-meta { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px; }

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;

		&.badge-success { background-color: var(--color-success-light); color: var(--color-success); }
		&.badge-info { background-color: var(--color-info-light); color: var(--color-info); }
		&.badge-warning { background-color: var(--color-warning-light); color: var(--color-warning); }
		&.badge-danger { background-color: var(--color-danger-light); color: var(--color-danger); }
		&.badge-neutral { background-color: var(--color-bg-sunken); color: var(--color-text-secondary); }
	}

	.empty-state {
		padding: var(--space-3xl);
		text-align: center;
		color: var(--color-text-tertiary);
	}

	.form-fields { display: flex; flex-direction: column; gap: var(--space-lg); margin-bottom: var(--space-xl); }
	.field { display: flex; flex-direction: column; gap: var(--space-sm); }
	.select-input {
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.875rem;
	}
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
