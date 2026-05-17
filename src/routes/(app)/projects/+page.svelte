<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, SearchBar, Pagination, Modal, Input, Label, Textarea } from '$lib/ui';
	import { PROJECT_PRIORITIES, PROJECT_PRIORITY_LABELS } from '$lib/domain/project/types';
	import { Plus, Trash2 } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state(untrack(() => data.search));
	let showEditor = $state(false);
	let saving = $state(false);

	function navigate(overrides: Record<string, string> = {}) {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		params.set('page', '1');
		for (const [k, v] of Object.entries(overrides)) params.set(k, v);
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	const priorityColor: Record<string, string> = {
		low: 'var(--color-text-tertiary)',
		medium: 'var(--color-info)',
		high: 'var(--color-warning)',
		urgent: 'var(--color-danger)'
	};
</script>

<svelte:head>
	<title>Projects — Limerick</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Projects</h1>
		<Button variant="primary" size="sm" onclick={() => (showEditor = true)}>
			<Plus size={14} /> New project
		</Button>
	</div>

	<SearchBar
		bind:value={search}
		placeholder="Search projects..."
		onsearch={navigate}
	/>

	{#if data.projects.length > 0}
		<div class="project-list">
			{#each data.projects as project (project.id)}
				<a href="/projects/{project.id}" class="project-card">
					<div class="project-main">
						<div class="project-title">{project.title}</div>
						{#if project.description}
							<div class="project-desc">{project.description}</div>
						{/if}
						<div class="project-meta">
							{#if project.status}
								<span class="status-dot" style="background-color: {project.status.color}"></span>
								<span>{project.status.label}</span>
							{/if}
							{#if project.category}
								<span class="separator">·</span>
								<span>{project.category.label}</span>
							{/if}
							{#if project.end_date}
								<span class="separator">·</span>
								<span>Due {formatDate(project.end_date)}</span>
							{/if}
						</div>
					</div>
					<div class="project-right">
						<span class="priority" style="color: {priorityColor[project.priority]}">
							{PROJECT_PRIORITY_LABELS[project.priority]}
						</span>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<form
							method="POST"
							action="?/delete"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									await invalidateAll();
								};
							}}
							onclick={(e) => e.stopPropagation()}
						>
							<input type="hidden" name="id" value={project.id} />
							<button type="submit" class="delete-btn" aria-label="Delete project">
								<Trash2 size={14} />
							</button>
						</form>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<p>No projects yet.</p>
			<Button variant="primary" size="sm" onclick={() => (showEditor = true)}>
				<Plus size={14} /> Create your first project
			</Button>
		</div>
	{/if}

	{#if data.totalPages > 1}
		<Pagination
			currentPage={data.page}
			totalPages={data.totalPages}
			onpagechange={(p: number) => navigate({ page: String(p) })}
		/>
	{/if}
</div>

<!-- Create Project Modal -->
<Modal open={showEditor} title="New project" onclose={() => (showEditor = false)}>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				showEditor = false;
				saving = false;
			};
		}}
	>
		<div class="form-fields">
			<div class="field">
				<Label for="title" required>Project name</Label>
				<Input id="title" name="title" required />
			</div>
			<div class="field">
				<Label for="description">Description</Label>
				<Textarea id="description" name="description" rows={3} />
			</div>
			<div class="field-row">
				<div class="field">
					<Label for="status_id">Status</Label>
					<select id="status_id" name="status_id" class="select-input">
						<option value="">— None —</option>
						{#each data.statuses as s (s.id)}
							<option value={s.id}>{s.label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<Label for="priority">Priority</Label>
					<select id="priority" name="priority" class="select-input">
						{#each PROJECT_PRIORITIES as p (p)}
							<option value={p} selected={p === 'medium'}>{PROJECT_PRIORITY_LABELS[p]}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="field-row">
				<div class="field">
					<Label for="start_date" required>Start date</Label>
					<Input id="start_date" name="start_date" type="date" required />
				</div>
				<div class="field">
					<Label for="end_date" required>End date</Label>
					<Input id="end_date" name="end_date" type="date" required />
				</div>
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEditor = false)}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={saving}>Create project</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.project-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.project-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text);
		transition: border-color var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
		}
	}

	.project-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		min-width: 0;
	}

	.project-title {
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.project-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.separator {
		color: var(--color-text-tertiary);
	}

	.project-right {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-shrink: 0;
	}

	.priority {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.delete-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);

		&:hover {
			background-color: var(--color-danger-light);
			color: var(--color-danger);
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-3xl);
		text-align: center;
		color: var(--color-text-tertiary);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex: 1;
	}

	.field-row {
		display: flex;
		gap: var(--space-md);
	}

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
