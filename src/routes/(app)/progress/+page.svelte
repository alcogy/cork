<script lang="ts">
	import { Button, Modal, Input, Label, Textarea } from '$lib/ui';
	import { Plus, Trash2 } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showEditor = $state(false);
	let saving = $state(false);
</script>

<svelte:head>
	<title>Progress — Cork</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Progress (WBS)</h1>
		<Button variant="primary" size="sm" onclick={() => (showEditor = true)}>
			<Plus size={14} /> New WBS project
		</Button>
	</div>

	{#if data.wbsList.length > 0}
		<div class="wbs-list">
			{#each data.wbsList as wbs (wbs.id)}
				<a href="/progress/{wbs.id}" class="wbs-card">
					<div class="wbs-main">
						<div class="wbs-title">{wbs.title}</div>
						{#if wbs.description}
							<div class="wbs-desc">{wbs.description}</div>
						{/if}
						<div class="wbs-meta">
							<span>{formatDate(wbs.start_date)} — {formatDate(wbs.end_date)}</span>
							<span>· {wbs.members.length} member{wbs.members.length !== 1 ? 's' : ''}</span>
						</div>
					</div>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}
						onclick={(e) => e.stopPropagation()}
					>
						<input type="hidden" name="id" value={wbs.id} />
						<button type="submit" class="delete-btn" aria-label="Delete WBS">
							<Trash2 size={14} />
						</button>
					</form>
				</a>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<p>No WBS projects yet.</p>
		</div>
	{/if}
</div>

<Modal open={showEditor} title="New WBS project" onclose={() => (showEditor = false)}>
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
				<Label for="title" required>Project name</Label>
				<Input id="title" name="title" required />
			</div>
			<div class="field">
				<Label for="description">Description</Label>
				<Textarea id="description" name="description" rows={2} />
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
			<Button type="submit" variant="primary" disabled={saving}>Create</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-lg); }
	.page-header { display: flex; align-items: center; justify-content: space-between; }
	.page-title { font-size: 1.5rem; font-weight: 700; }
	.wbs-list { display: flex; flex-direction: column; gap: var(--space-sm); }

	.wbs-card {
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

		&:hover { border-color: var(--color-primary); }
	}

	.wbs-title { font-weight: 500; }
	.wbs-desc { font-size: 0.8125rem; color: var(--color-text-secondary); }
	.wbs-meta { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px; }

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
		flex-shrink: 0;

		&:hover { background-color: var(--color-danger-light); color: var(--color-danger); }
	}

	.empty-state { padding: var(--space-3xl); text-align: center; color: var(--color-text-tertiary); }
	.form-fields { display: flex; flex-direction: column; gap: var(--space-lg); margin-bottom: var(--space-xl); }
	.field { display: flex; flex-direction: column; gap: var(--space-sm); flex: 1; }
	.field-row { display: flex; gap: var(--space-md); }
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
