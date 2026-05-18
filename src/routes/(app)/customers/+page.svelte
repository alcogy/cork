<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Table, SearchBar, Pagination, Modal, Input, Label } from '$lib/ui';
	import { CUSTOMER_STATUS_LABELS, CUSTOMER_STATUSES } from '$lib/types/customer';
	import { Plus, Download } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state(untrack(() => data.search ?? ''));
	let statusFilter = $state(untrack(() => data.statusFilter || 'all'));
	let showEditor = $state(false);
	let editingCustomer = $state<(typeof data.customers)[0] | null>(null);
	let saving = $state(false);

	const columns = $derived([
		{ key: 'name', label: t().customer.name },
		{ key: 'email', label: t().customer.email },
		{ key: 'tel', label: t().customer.tel },
		{ key: 'address', label: t().customer.address },
		{ key: 'note_count', label: t().customer.notes, width: '80px' },
		{ key: 'status', label: t().customer.status, width: '100px' }
	]);

	function navigate(overrides: Record<string, string> = {}) {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
		params.set('page', '1');
		for (const [k, v] of Object.entries(overrides)) params.set(k, v);
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function openCreate() {
		editingCustomer = null;
		showEditor = true;
	}

	function openEdit(customer: (typeof data.customers)[0]) {
		editingCustomer = customer;
		showEditor = true;
	}

	function getExportUrl() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
		return `/customers/export?${params.toString()}`;
	}

	const statusBadgeClass: Record<string, string> = {
		active: 'badge-success',
		inactive: 'badge-neutral',
		lead: 'badge-warning'
	};
</script>

<svelte:head>
	<title>{t().customer.title} — Cork</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t().customer.title}</h1>
		<div class="page-actions">
			<a href={getExportUrl()} class="btn-link">
				<Button variant="secondary" size="sm"><Download size={14} /> {t().customer.exportCsv}</Button>
			</a>
			<Button variant="primary" size="sm" onclick={openCreate}><Plus size={14} /> {t().customer.new}</Button>
		</div>
	</div>

	<div class="filters">
		<SearchBar
			bind:value={search}
			placeholder="Search by name, email, phone..."
			onsearch={() => navigate()}
		/>
		<select
			class="status-select"
			bind:value={statusFilter}
			onchange={() => navigate()}
			aria-label="Filter by status"
		>
			<option value="all">{t().common.all}</option>
			{#each CUSTOMER_STATUSES as s (s)}
				<option value={s}>{CUSTOMER_STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</div>

	<Table {columns} rows={data.customers} onrowclick={(row) => goto(`/customers/${row.id}`)}>
		{#snippet cell(col, row)}
			{#if col.key === 'status'}
				<span class="badge {statusBadgeClass[row.status] ?? 'badge-neutral'}">
					{CUSTOMER_STATUS_LABELS[row.status] ?? row.status}
				</span>
			{:else if col.key === 'note_count'}
				{#if row.note_count > 0}
					<span class="note-count">{row.note_count}</span>
				{:else}
					<span class="text-tertiary">—</span>
				{/if}
			{:else}
				{(row as Record<string, unknown>)[col.key] ?? '—'}
			{/if}
		{/snippet}
	</Table>

	{#if data.totalPages > 1}
		<Pagination
			currentPage={data.page}
			totalPages={data.totalPages}
			onpagechange={(p: number) => navigate({ page: String(p) })}
		/>
	{/if}

	<p class="total-count">{t().common.total}: {data.total}</p>
</div>

<!-- Customer Editor Modal -->
<Modal
	open={showEditor}
	title={editingCustomer ? t().customer.edit : t().customer.new}
	onclose={() => (showEditor = false)}
>
	<form
		method="POST"
		action={editingCustomer ? '?/update' : '?/create'}
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
		{#if editingCustomer}
			<input type="hidden" name="id" value={editingCustomer.id} />
		{/if}

		<div class="form-grid">
			<div class="field full">
				<Label for="name" required>{t().customer.name}</Label>
				<Input id="name" name="name" value={editingCustomer?.name ?? ''} required />
			</div>
			<div class="field">
				<Label for="email">{t().customer.email}</Label>
				<Input id="email" name="email" type="email" value={editingCustomer?.email ?? ''} />
			</div>
			<div class="field">
				<Label for="tel">{t().customer.tel}</Label>
				<Input id="tel" name="tel" value={editingCustomer?.tel ?? ''} />
			</div>
			<div class="field">
				<Label for="fax">{t().customer.fax}</Label>
				<Input id="fax" name="fax" value={editingCustomer?.fax ?? ''} />
			</div>
			<div class="field">
				<Label for="zipcode">{t().customer.zipcode}</Label>
				<Input id="zipcode" name="zipcode" value={editingCustomer?.zipcode ?? ''} />
			</div>
			<div class="field full">
				<Label for="address">{t().customer.address}</Label>
				<Input id="address" name="address" value={editingCustomer?.address ?? ''} />
			</div>
			<div class="field">
				<Label for="status">{t().customer.status}</Label>
				<select id="status" name="status" class="select-input">
					{#each CUSTOMER_STATUSES as s (s)}
						<option value={s} selected={editingCustomer?.status === s}>{CUSTOMER_STATUS_LABELS[s]}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEditor = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>
				{saving ? t().common.loading : editingCustomer ? t().common.save : t().common.create}
			</Button>
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
		gap: var(--space-md);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.btn-link {
		text-decoration: none;
	}

	.filters {
		display: flex;
		gap: var(--space-md);
		align-items: center;
		flex-wrap: wrap;
	}

	.status-select {
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;

		&.badge-success {
			background-color: var(--color-success-light);
			color: var(--color-success);
		}
		&.badge-neutral {
			background-color: var(--color-bg-sunken);
			color: var(--color-text-secondary);
		}
		&.badge-warning {
			background-color: var(--color-warning-light);
			color: var(--color-warning);
		}
	}

	.note-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 4px;
		background-color: var(--color-warning-light);
		color: var(--color-warning);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.text-tertiary {
		color: var(--color-text-tertiary);
	}

	.total-count {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&.full {
			grid-column: 1 / -1;
		}
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
