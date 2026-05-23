<script lang="ts">
	import { AccountEditor, Button, ConfirmDialog, Table } from '$lib/ui';
	import { Plus, Pencil, Trash2, ShieldCheck, User } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Account = (typeof data.accounts)[0];

	let showEditor = $state(false);
	let editingAccount = $state<Account | null>(null);
	let showConfirm = $state(false);
	let deletingId = $state<string | null>(null);
	let deleteFormEl = $state<HTMLFormElement | null>(null);

	const columns = $derived([
		{ key: 'name', label: t().account.name },
		{ key: 'email', label: t().account.email },
		{ key: 'role', label: t().account.role, width: '140px' },
		{ key: 'created_at', label: t().common.createdAt, width: '140px' }
	]);

	function openCreate() {
		editingAccount = null;
		showEditor = true;
	}

	function openEdit(account: Account) {
		editingAccount = account;
		showEditor = true;
	}

	function confirmDelete(id: string) {
		deletingId = id;
		showConfirm = true;
	}

	function handleDeleteConfirm() {
		deleteFormEl?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{t().account.title} — Cork</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t().account.title}</h1>
		<Button variant="primary" size="sm" onclick={openCreate}><Plus size={14} /> {t().account.new}</Button>
	</div>

	<Table {columns} rows={data.accounts}>
		{#snippet cell(col, row)}
			{#if col.key === 'role'}
				<span class="role-badge {row.role === 'admin' ? 'role-admin' : 'role-general'}">
					{#if row.role === 'admin'}
						<ShieldCheck size={12} /> {t().account.roles.admin}
					{:else}
						<User size={12} /> {t().account.roles.general}
					{/if}
				</span>
			{:else if col.key === 'created_at'}
				{row.created_at ? row.created_at.slice(0, 10) : '—'}
			{:else}
				{row[col.key as keyof typeof row] ?? '—'}
			{/if}
		{/snippet}
		{#snippet actions(row)}
			<button class="icon-btn" onclick={() => openEdit(row)} title="Edit"><Pencil size={14} /></button>
			<button class="icon-btn danger" onclick={() => confirmDelete(row.id)} title="Delete"><Trash2 size={14} /></button>
		{/snippet}
	</Table>
</div>

<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/delete"
	class="hidden"
	use:enhance={() =>
		async ({ update }) => {
			await update();
			await invalidateAll();
		}}
>
	<input type="hidden" name="id" value={deletingId} />
</form>

<AccountEditor
	bind:open={showEditor}
	account={editingAccount}
	onsave={() => invalidateAll()}
/>

<ConfirmDialog
	bind:open={showConfirm}
	title={t().account.delete}
	message={t().account.deleteConfirm}
	confirmLabel={t().common.delete}
	onconfirm={handleDeleteConfirm}
/>

<style lang="scss">
	.hidden {
		display: none;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-lg);
	}

	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;

		&.role-admin {
			background: var(--color-primary-light);
			color: var(--color-primary);
		}

		&.role-general {
			background: var(--color-bg-subtle);
			color: var(--color-text-muted);
		}
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;

		&:hover {
			background: var(--color-bg-hover);
			color: var(--color-text);
		}

		&.danger:hover {
			background: var(--color-error-light);
			color: var(--color-error);
		}
	}
</style>
