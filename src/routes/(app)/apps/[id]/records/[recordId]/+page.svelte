<script lang="ts">
	import { Button, Modal, Input, Label, Textarea, ConfirmDialog } from '$lib/ui';
	import { ArrowLeft, Pencil, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { formatDateTimeJP } from '$lib/utils';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showEditModal = $state(false);
	let showDeleteDialog = $state(false);
	let saving = $state(false);

	function enh(onDone?: () => void) {
		return () => {
			saving = true;
			return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
				await update({ reset: false });
				await invalidateAll();
				onDone?.();
				saving = false;
			};
		};
	}

	function getDisplayValue(fieldId: string): string {
		const val = data.record.dataParsed[fieldId];
		if (val === undefined || val === null || val === '') return '—';
		return String(val);
	}

	function getInitialValue(fieldId: string, type: string): string {
		const val = data.record.dataParsed[fieldId];
		if (val === undefined || val === null) return '';
		if (type === 'checkbox') return String(val);
		return String(val);
	}

	function isChecked(fieldId: string, optionLabel: string): boolean {
		const val = data.record.dataParsed[fieldId];
		if (!val) return false;
		return String(val).split(', ').includes(optionLabel);
	}
</script>

<svelte:head>
	<title>{t().apps.recordDetail} — {data.app.name} — Cork</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/apps/{data.app.id}" class="back-link">
			<ArrowLeft size={16} /> {data.app.name}
		</a>
	</div>

	<div class="page-header">
		<h1>{t().apps.recordDetail}</h1>
		<div class="header-actions">
			<Button variant="secondary" size="sm" onclick={() => (showEditModal = true)}>
				<Pencil size={14} /> {t().apps.editRecord}
			</Button>
			<Button variant="ghost" size="sm" onclick={() => (showDeleteDialog = true)}>
				<Trash2 size={14} /> {t().apps.deleteRecord}
			</Button>
		</div>
	</div>

	<div class="detail-card">
		{#each data.app.fieldsParsed as field (field.id)}
			<div class="detail-row">
				<dt class="detail-label">{field.label}</dt>
				<dd class="detail-value">{getDisplayValue(field.id)}</dd>
			</div>
		{/each}
		<div class="detail-row detail-meta">
			<dt class="detail-label">{t().common.createdAt}</dt>
			<dd class="detail-value">{formatDateTimeJP(data.record.created_at)}</dd>
		</div>
		{#if data.record.updated_at !== data.record.created_at}
			<div class="detail-row detail-meta">
				<dt class="detail-label">{t().common.updatedAt}</dt>
				<dd class="detail-value">{formatDateTimeJP(data.record.updated_at)}</dd>
			</div>
		{/if}
	</div>
</div>

<!-- Edit Modal -->
<Modal open={showEditModal} title={t().apps.editRecord} onclose={() => (showEditModal = false)}>
	<form method="POST" action="?/update" use:enhance={enh(() => (showEditModal = false))}>
		<div class="form-fields">
			{#each data.app.fieldsParsed as field (field.id)}
				<div class="field">
					<Label for="f-{field.id}" required={field.required}>{field.label}</Label>
					{#if field.type === 'textarea'}
						<Textarea
							id="f-{field.id}"
							name={field.id}
							rows={3}
							placeholder={field.placeholder}
							required={field.required}
							value={getInitialValue(field.id, field.type)}
						/>
					{:else if field.type === 'select' && field.options}
						<select id="f-{field.id}" name={field.id} class="select-input" required={field.required}>
							<option value="">{t().apps.selectOption}</option>
							{#each field.options as opt (opt.id)}
								<option value={opt.label} selected={getDisplayValue(field.id) === opt.label}>
									{opt.label}
								</option>
							{/each}
						</select>
					{:else if field.type === 'radio' && field.options}
						<div class="radio-group" role="radiogroup">
							{#each field.options as opt (opt.id)}
								<label class="radio-label">
									<input
										type="radio"
										name={field.id}
										value={opt.label}
										checked={getDisplayValue(field.id) === opt.label}
										required={field.required}
									/>
									{opt.label}
								</label>
							{/each}
						</div>
					{:else if field.type === 'checkbox' && field.options && field.options.length > 0}
						<div class="checkbox-group">
							{#each field.options as opt (opt.id)}
								<label class="checkbox-label">
									<input
										type="checkbox"
										name={field.id}
										value={opt.label}
										checked={isChecked(field.id, opt.label)}
									/>
									{opt.label}
								</label>
							{/each}
						</div>
					{:else if field.type === 'number'}
						<Input
							id="f-{field.id}"
							name={field.id}
							type="number"
							placeholder={field.placeholder}
							required={field.required}
							value={getInitialValue(field.id, field.type)}
						/>
					{:else if field.type === 'date'}
						<Input
							id="f-{field.id}"
							name={field.id}
							type="date"
							required={field.required}
							value={getInitialValue(field.id, field.type)}
						/>
					{:else if field.type === 'datetime'}
						<Input
							id="f-{field.id}"
							name={field.id}
							type="datetime-local"
							required={field.required}
							value={getInitialValue(field.id, field.type)}
						/>
					{:else if field.type === 'link'}
						<Input
							id="f-{field.id}"
							name={field.id}
							type="url"
							placeholder={field.placeholder ?? 'https://'}
							required={field.required}
							value={getInitialValue(field.id, field.type)}
						/>
					{:else}
						<Input
							id="f-{field.id}"
							name={field.id}
							type="text"
							placeholder={field.placeholder}
							required={field.required}
							value={getInitialValue(field.id, field.type)}
						/>
					{/if}
				</div>
			{/each}
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEditModal = false)}>
				{t().common.cancel}
			</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().common.save}</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t().apps.deleteRecord}
	message={t().apps.deleteRecordConfirm}
	confirmLabel={t().common.delete}
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
		document.body.appendChild(form);
		form.submit();
	}}
	oncancel={() => (showDeleteDialog = false)}
/>

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

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		h1 { font-size: 1.25rem; font-weight: 700; }
	}

	.header-actions { display: flex; gap: var(--space-sm); }

	.detail-card {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.detail-row {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-light);

		&:last-child { border-bottom: none; }
		&.detail-meta .detail-label,
		&.detail-meta .detail-value { color: var(--color-text-tertiary); font-size: 0.8125rem; }
	}

	.detail-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		padding-top: 1px;
	}

	.detail-value {
		font-size: 0.875rem;
		color: var(--color-text);
		white-space: pre-wrap;
		word-break: break-word;
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

	.radio-group, .checkbox-group { display: flex; flex-direction: column; gap: var(--space-sm); }
	.radio-label, .checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.875rem;
		cursor: pointer;
		input { accent-color: var(--color-primary); }
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
