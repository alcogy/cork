<script lang="ts">
	import { Button, Modal, Input, Label, Textarea } from '$lib/ui';
	import { FIELD_TYPE_LABELS } from '$lib/domain/apps/types';
	import { ArrowLeft, Plus, Trash2, Wrench } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDateTime } from '$lib/utils';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showForm = $state(false);
	let saving = $state(false);

	function enh(onDone?: () => void) {
		return () => {
			saving = true;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				await invalidateAll();
				onDone?.();
				saving = false;
			};
		};
	}

	const listFields = $derived(data.app.fieldsParsed.filter((f) => f.show_in_list !== false));
</script>

<svelte:head>
	<title>{data.app.name} — Cork</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/apps" class="back-link"><ArrowLeft size={16} /> {t().apps.title}</a>
	</div>

	<div class="app-header">
		<div>
			<h1>{data.app.name}</h1>
			{#if data.app.description}
				<p class="app-desc">{data.app.description}</p>
			{/if}
		</div>
		<div class="header-actions">
			<span class="status-badge {data.app.is_published ? 'published' : 'draft'}">
				{data.app.is_published ? t().apps.published : t().apps.draft}
			</span>
			<form method="POST" action="?/togglePublish" use:enhance={enh()}>
				<Button type="submit" variant="secondary" size="sm">
					{data.app.is_published ? t().apps.unpublish : t().apps.publish}
				</Button>
			</form>
			<a href="/apps/{data.app.id}/build" class="btn-link">
				<Button variant="ghost" size="sm"><Wrench size={14} /> {t().apps.build}</Button>
			</a>
			<Button variant="primary" size="sm" onclick={() => (showForm = true)}>
				<Plus size={14} /> {t().apps.newRecord}
			</Button>
		</div>
	</div>

	{#if data.app.fieldsParsed.length === 0}
		<div class="empty-state">
			<p>{t().apps.noFields}</p>
			<a href="/apps/{data.app.id}/build" class="btn-link">
				<Button variant="primary" size="sm"><Wrench size={14} /> Go to Build</Button>
			</a>
		</div>
	{:else if data.records.length === 0}
		<div class="empty-state">
			<p>{t().common.noResults}</p>
			<Button variant="primary" size="sm" onclick={() => (showForm = true)}>
				<Plus size={14} /> {t().apps.newRecord}
			</Button>
		</div>
	{:else}
		<div class="records-table-wrapper">
			<table class="records-table">
				<thead>
					<tr>
						{#each listFields as field (field.id)}
							<th>{field.label}</th>
						{/each}
						<th class="th-date">{t().common.createdAt}</th>
						<th class="th-action"></th>
					</tr>
				</thead>
				<tbody>
					{#each data.records as record (record.id)}
						<tr>
							{#each listFields as field (field.id)}
								<td>{record.dataParsed[field.id] ?? '—'}</td>
							{/each}
							<td class="td-date">{formatDateTime(record.created_at)}</td>
							<td class="td-action">
								<form method="POST" action="?/delete" use:enhance={enh()}>
									<input type="hidden" name="id" value={record.id} />
									<button type="submit" class="del-btn" aria-label="Delete record">
										<Trash2 size={12} />
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- New Record Modal -->
<Modal open={showForm} title="{t().apps.newRecord} — {data.app.name}" onclose={() => (showForm = false)}>
	<form method="POST" action="?/create" use:enhance={enh(() => (showForm = false))}>
		<div class="form-fields">
			{#each data.app.fieldsParsed as field (field.id)}
				<div class="field">
					<Label for="f-{field.id}" required={field.required}>{field.label}</Label>
					{#if field.type === 'textarea'}
						<Textarea id="f-{field.id}" name={field.id} rows={3} placeholder={field.placeholder} required={field.required} />
					{:else if field.type === 'select' && field.options}
						<select id="f-{field.id}" name={field.id} class="select-input" required={field.required}>
							<option value="">Select...</option>
							{#each field.options as opt (opt.id)}
								<option value={opt.label}>{opt.label}</option>
							{/each}
						</select>
					{:else if field.type === 'checkbox'}
						<input id="f-{field.id}" name={field.id} type="checkbox" value="true" />
					{:else if field.type === 'number'}
						<Input id="f-{field.id}" name={field.id} type="number" placeholder={field.placeholder} required={field.required} />
					{:else if field.type === 'date'}
						<Input id="f-{field.id}" name={field.id} type="date" required={field.required} />
					{:else if field.type === 'datetime'}
						<Input id="f-{field.id}" name={field.id} type="datetime-local" required={field.required} />
					{:else if field.type === 'link'}
						<Input id="f-{field.id}" name={field.id} type="url" placeholder={field.placeholder ?? 'https://'} required={field.required} />
					{:else}
						<Input id="f-{field.id}" name={field.id} type="text" placeholder={field.placeholder} required={field.required} />
					{/if}
				</div>
			{/each}
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showForm = false)}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={saving}>Create</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-xl); }

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		&:hover { color: var(--color-text); }
	}

	.app-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);

		h1 { font-size: 1.5rem; }
	}

	.app-desc { font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 4px; }

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.status-badge {
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;

		&.published { background-color: var(--color-success-light); color: var(--color-success); }
		&.draft { background-color: var(--color-bg-sunken); color: var(--color-text-secondary); }
	}

	.btn-link { text-decoration: none; }

	.records-table-wrapper {
		overflow-x: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
	}

	.records-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;

		th {
			padding: var(--space-md) var(--space-lg);
			text-align: left;
			font-weight: 600;
			color: var(--color-text-secondary);
			background-color: var(--color-bg-sunken);
			border-bottom: 1px solid var(--color-border-light);
			white-space: nowrap;
		}

		td {
			padding: var(--space-md) var(--space-lg);
			border-bottom: 1px solid var(--color-border-light);
			color: var(--color-text);
		}

		tbody tr:last-child td { border-bottom: none; }
		tbody tr:hover { background-color: var(--color-hover); }
	}

	.th-date { width: 160px; }
	.th-action { width: 48px; }
	.td-date { color: var(--color-text-tertiary); font-size: 0.75rem; }
	.td-action { text-align: right; }

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
