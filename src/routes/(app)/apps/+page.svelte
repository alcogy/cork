<script lang="ts">
	import { Button, Modal, Input, Label, Textarea } from '$lib/ui';
	import { Plus, Trash2, Wrench } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showEditor = $state(false);
	let saving = $state(false);
</script>

<svelte:head>
	<title>Apps — Cork</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div>
			<h1 class="page-title">Apps</h1>
			<p class="page-subtitle">Build custom apps with no code</p>
		</div>
		<Button variant="primary" size="sm" onclick={() => (showEditor = true)}>
			<Plus size={14} /> New app
		</Button>
	</div>

	{#if data.apps.length > 0}
		<div class="apps-grid">
			{#each data.apps as app (app.id)}
				<div class="app-card">
					<div class="app-header">
						<div class="app-info">
							<div class="app-name">{app.name}</div>
							{#if app.description}
								<div class="app-desc">{app.description}</div>
							{/if}
						</div>
						<span class="app-status {app.is_published ? 'published' : 'draft'}">
							{app.is_published ? 'Published' : 'Draft'}
						</span>
					</div>
					<div class="app-stats">
						<span>{app.field_count} field{app.field_count !== 1 ? 's' : ''}</span>
						<span>·</span>
						<span>{app.record_count} record{app.record_count !== 1 ? 's' : ''}</span>
					</div>
					<div class="app-actions">
						<a href="/apps/{app.id}" class="btn-link">
							<Button variant="secondary" size="sm">View records</Button>
						</a>
						<a href="/apps/{app.id}/build" class="btn-link">
							<Button variant="ghost" size="sm"><Wrench size={14} /> Build</Button>
						</a>
						<form
							method="POST"
							action="?/delete"
							use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}
						>
							<input type="hidden" name="id" value={app.id} />
							<button type="submit" class="delete-btn" aria-label="Delete app">
								<Trash2 size={14} />
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<p>No apps yet. Create your first app to get started.</p>
			<Button variant="primary" size="sm" onclick={() => (showEditor = true)}>
				<Plus size={14} /> Create an app
			</Button>
		</div>
	{/if}
</div>

<Modal open={showEditor} title="New app" onclose={() => (showEditor = false)}>
	<form method="POST" action="?/create" use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			await update();
			await invalidateAll();
			showEditor = false;
			saving = false;
		};
	}}>
		<div class="form-fields">
			<div class="field">
				<Label for="name" required>App name</Label>
				<Input id="name" name="name" required />
			</div>
			<div class="field">
				<Label for="description">Description</Label>
				<Textarea id="description" name="description" rows={2} />
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEditor = false)}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={saving}>Create</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-xl); }

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.page-title { font-size: 1.5rem; font-weight: 700; }
	.page-subtitle { font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 4px; }

	.apps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.app-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.app-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.app-name { font-weight: 600; }
	.app-desc { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 2px; }

	.app-status {
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;

		&.published { background-color: var(--color-success-light); color: var(--color-success); }
		&.draft { background-color: var(--color-bg-sunken); color: var(--color-text-secondary); }
	}

	.app-stats {
		display: flex;
		gap: var(--space-xs);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.app-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.btn-link { text-decoration: none; }

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
		margin-left: auto;

		&:hover { background-color: var(--color-danger-light); color: var(--color-danger); }
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

	.form-fields { display: flex; flex-direction: column; gap: var(--space-lg); margin-bottom: var(--space-xl); }
	.field { display: flex; flex-direction: column; gap: var(--space-sm); }
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
