<script lang="ts">
	import { Button, Input, Label } from '$lib/ui';
	import { Plus, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);

	function enh() {
		return () => {
			saving = true;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				await invalidateAll();
				saving = false;
			};
		};
	}
</script>

<svelte:head>
	<title>Settings — Cork</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">Settings</h1>
	<p class="page-desc">Configure system-wide settings. Admin access only.</p>

	<!-- General Settings -->
	<section class="settings-section">
		<h2>General</h2>
		<div class="settings-card">
			<form method="POST" action="?/saveSetting" use:enhance={enh()} class="setting-row">
				<input type="hidden" name="key" value="page_num" />
				<div class="setting-info">
					<div class="setting-label">Records per page</div>
					<div class="setting-desc">Number of items shown per page in list views</div>
				</div>
				<div class="setting-control">
					<Input name="value" type="number" value={data.settingsMap['page_num'] ?? '30'} style="width: 80px" />
					<Button type="submit" variant="secondary" size="sm" disabled={saving}>Save</Button>
				</div>
			</form>
		</div>
	</section>

	<!-- Project Statuses -->
	<section class="settings-section">
		<h2>Project statuses</h2>
		<div class="settings-card">
			{#each data.projectStatuses as status (status.id)}
				<div class="list-row">
					<span class="status-dot" style="background-color: {status.color}"></span>
					<span class="list-label">{status.label}</span>
					<form method="POST" action="?/deleteProjectStatus" use:enhance={enh()}>
						<input type="hidden" name="id" value={status.id} />
						<button type="submit" class="del-btn" aria-label="Delete status" disabled={saving}>
							<Trash2 size={13} />
						</button>
					</form>
				</div>
			{/each}
			<form method="POST" action="?/addProjectStatus" use:enhance={enh()} class="add-row">
				<input name="label" class="inline-input" placeholder="New status..." required />
				<input name="color" type="color" class="color-input" value="#94a3b8" />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<Plus size={13} /> Add
				</Button>
			</form>
		</div>
	</section>

	<!-- Project Categories -->
	<section class="settings-section">
		<h2>Project categories</h2>
		<div class="settings-card">
			{#each data.projectCategories as cat (cat.id)}
				<div class="list-row">
					<span class="list-label">{cat.label}</span>
					<form method="POST" action="?/deleteProjectCategory" use:enhance={enh()}>
						<input type="hidden" name="id" value={cat.id} />
						<button type="submit" class="del-btn" aria-label="Delete category" disabled={saving}>
							<Trash2 size={13} />
						</button>
					</form>
				</div>
			{/each}
			<form method="POST" action="?/addProjectCategory" use:enhance={enh()} class="add-row">
				<input name="label" class="inline-input" placeholder="New category..." required />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<Plus size={13} /> Add
				</Button>
			</form>
		</div>
	</section>

	<!-- Workflow Categories -->
	<section class="settings-section">
		<h2>Approval categories</h2>
		<div class="settings-card">
			{#each data.workflowCategories as cat (cat.id)}
				<div class="list-row">
					<span class="status-dot" style="background-color: {cat.color}"></span>
					<span class="list-label">{cat.label}</span>
					<form method="POST" action="?/deleteWorkflowCategory" use:enhance={enh()}>
						<input type="hidden" name="id" value={cat.id} />
						<button type="submit" class="del-btn" aria-label="Delete category" disabled={saving}>
							<Trash2 size={13} />
						</button>
					</form>
				</div>
			{/each}
			<form method="POST" action="?/addWorkflowCategory" use:enhance={enh()} class="add-row">
				<input name="label" class="inline-input" placeholder="New category..." required />
				<input name="color" type="color" class="color-input" value="#6b7280" />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<Plus size={13} /> Add
				</Button>
			</form>
		</div>
	</section>
</div>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-2xl); max-width: 720px; }
	.page-title { font-size: 1.5rem; font-weight: 700; }
	.page-desc { font-size: 0.875rem; color: var(--color-text-secondary); margin-top: -var(--space-lg); }

	.settings-section { display: flex; flex-direction: column; gap: var(--space-md); }
	.settings-section h2 { font-size: 1rem; font-weight: 600; }

	.settings-card {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-lg);
	}

	.setting-info { flex: 1; }
	.setting-label { font-weight: 500; font-size: 0.875rem; }
	.setting-desc { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 2px; }
	.setting-control { display: flex; align-items: center; gap: var(--space-sm); }

	.list-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-light);
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.list-label { flex: 1; font-size: 0.875rem; }

	.add-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
	}

	.inline-input {
		flex: 1;
		height: 34px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.8125rem;
		font-family: inherit;

		&:focus { outline: none; border-color: var(--color-border-focus); }
	}

	.color-input {
		width: 36px;
		height: 34px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 2px;
		cursor: pointer;
		flex-shrink: 0;
	}

	.del-btn {
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

		&:hover { background-color: var(--color-danger-light); color: var(--color-danger); }
		&:disabled { opacity: 0.5; cursor: not-allowed; }
	}
</style>
