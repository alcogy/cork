<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import {
		ArrowLeft, Save, Type, AlignLeft, Hash, Calendar, Clock,
		ChevronDown, CheckSquare, CircleDot, GripVertical, Trash2, Plus, X,
		Eye, EyeOff, Link, User, OctagonAlert
	} from '@lucide/svelte';
	import { ConfirmDialog } from '$lib/ui';
	import { t } from '$lib/i18n';
	import { FIELD_TYPE_LABELS } from '$lib/types/apps';
	import type { AppField, FieldType } from '$lib/types/apps';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let appName = $state(untrack(() => data.app.name));
	let appDescription = $state(untrack(() => data.app.description));
	let fields = $state<AppField[]>(untrack(() => data.app.fields.map((f) => ({ ...f }))));
	let selectedFieldId = $state<string | null>(null);
	let saved = $state(false);
	let showDeleteDialog = $state(false);

	const fieldsJson = $derived(JSON.stringify(fields));
	const selectedField = $derived(fields.find((f) => f.id === selectedFieldId) ?? null);

	const paletteItems: { type: FieldType; icon: typeof Type }[] = [
		{ type: 'text', icon: Type },
		{ type: 'textarea', icon: AlignLeft },
		{ type: 'link', icon: Link },
		{ type: 'number', icon: Hash },
		{ type: 'date', icon: Calendar },
		{ type: 'datetime', icon: Clock },
		{ type: 'select', icon: ChevronDown },
		{ type: 'checkbox', icon: CheckSquare },
		{ type: 'radio', icon: CircleDot },
		{ type: 'user', icon: User }
	];

	function hasOptions(type: FieldType) {
		return type === 'select' || type === 'checkbox' || type === 'radio';
	}

	function addField(type: FieldType) {
		const id = crypto.randomUUID();
		fields = [...fields, { id, type, label: FIELD_TYPE_LABELS[type], required: false, show_in_list: true }];
		selectedFieldId = id;
	}

	function removeField(id: string) {
		fields = fields.filter((f) => f.id !== id);
		if (selectedFieldId === id) selectedFieldId = null;
	}

	function addOption(field: AppField) {
		const idx = fields.findIndex((f) => f.id === field.id);
		if (idx < 0) return;
		const opts = [...(fields[idx].options ?? []), { id: crypto.randomUUID(), label: '' }];
		fields[idx] = { ...fields[idx], options: opts };
	}

	function removeOption(field: AppField, optId: string) {
		const idx = fields.findIndex((f) => f.id === field.id);
		if (idx < 0) return;
		fields[idx] = { ...fields[idx], options: (fields[idx].options ?? []).filter((o) => o.id !== optId) };
	}

	// Drag reorder
	let dragFrom = $state<number | null>(null);
	let dragOver = $state<number | null>(null);

	function onDragStart(i: number) { dragFrom = i; }
	function onDragEnter(i: number) { dragOver = i; }
	function onDrop() {
		if (dragFrom === null || dragOver === null || dragFrom === dragOver) { dragFrom = dragOver = null; return; }
		const a = [...fields];
		const [moved] = a.splice(dragFrom, 1);
		a.splice(dragOver, 0, moved);
		fields = a;
		dragFrom = dragOver = null;
	}
</script>

<svelte:head>
	<title>Build — {data.app.name}</title>
</svelte:head>

<form method="POST" action="?/save" use:enhance={() => {
	return async ({ update }) => {
		await update();
		saved = true;
		setTimeout(() => (saved = false), 2000);
	};
}} class="build-shell">
	<input type="hidden" name="fields" value={fieldsJson} />

	<!-- Top bar -->
	<div class="topbar">
		<a href="/apps/{data.app.id}" class="back-link"><ArrowLeft size={16} /> {t().common.back}</a>
		<div class="app-name-wrap">
			<input
				class="app-name-input"
				name="name"
				bind:value={appName}
				placeholder={t().apps.name}
				required
			/>
		</div>
		<div class="topbar-actions">
			{#if saved}
				<span class="saved-hint">{t().apps.saved}</span>
			{/if}
			<button type="submit" class="save-btn">
				<Save size={15} /> {t().common.save}
			</button>
			<button type="button" class="delete-btn-top" onclick={() => (showDeleteDialog = true)}>
				<Trash2 size={14} />
			</button>
		</div>
	</div>

	<input type="hidden" name="description" value={appDescription} />

	<!-- Three-column layout -->
	<div class="build-body">
		<!-- Left: field palette -->
		<div class="palette">
			<div class="palette-title">{t().apps.fieldTypesPanel}</div>
			{#each paletteItems as item (item.type)}
				<button type="button" class="palette-item" onclick={() => addField(item.type)}>
					<item.icon size={14} />
					{FIELD_TYPE_LABELS[item.type]}
				</button>
			{/each}
		</div>

		<!-- Center: field list -->
		<div class="field-canvas" role="list">
			{#if fields.length === 0}
				<div class="canvas-empty">
					<Plus size={24} />
					<p>{t().apps.addFromPanel}</p>
				</div>
			{:else}
				{#each fields as field, i (field.id)}
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div
						role="listitem"
						class="field-row {selectedFieldId === field.id ? 'selected' : ''} {dragOver === i ? 'drag-over' : ''}"
						onclick={() => (selectedFieldId = field.id)}
						onkeydown={(e) => e.key === 'Enter' && (selectedFieldId = field.id)}
						draggable={true}
						ondragstart={() => onDragStart(i)}
						ondragenter={() => onDragEnter(i)}
						ondragover={(e) => e.preventDefault()}
						ondrop={onDrop}
					>
						<span class="drag-handle"><GripVertical size={14} /></span>
						<span class="field-label">{field.label || t().apps.noLabel}</span>
						<span class="field-type-tag">{FIELD_TYPE_LABELS[field.type]}</span>
						{#if !field.show_in_list}
							<EyeOff size={13} class="eye-icon" />
						{/if}
						{#if field.required}
							<span class="required-star">*</span>
						{/if}
						<button
							type="button"
							class="remove-field-btn"
							onclick={(e) => { e.stopPropagation(); removeField(field.id); }}
							aria-label="Remove field"
						>
							<X size={13} />
						</button>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Right: field settings -->
		<div class="field-settings">
			{#if selectedField}
				{@const sf = selectedField}
				<div class="settings-title">{t().apps.fieldSettings}</div>

				<div class="settings-field">
					<label class="settings-label" for="sf-label">{t().apps.fieldLabel}</label>
					<input
						id="sf-label"
						class="settings-input"
						type="text"
						bind:value={fields[fields.findIndex((f) => f.id === sf.id)].label}
						placeholder={t().apps.fieldLabelPlaceholder}
					/>
				</div>

				{#if sf.type !== 'checkbox'}
					<div class="settings-field">
						<label class="settings-label" for="sf-placeholder">{t().apps.fieldPlaceholder}</label>
						<input
							id="sf-placeholder"
							class="settings-input"
							type="text"
							bind:value={fields[fields.findIndex((f) => f.id === sf.id)].placeholder}
							placeholder={t().apps.hintTextPlaceholder}
						/>
					</div>
				{/if}

				<div class="settings-toggles">
					<label class="toggle-row">
						<input
							type="checkbox"
							bind:checked={fields[fields.findIndex((f) => f.id === sf.id)].required}
						/>
						{t().common.required}
					</label>
					<label class="toggle-row">
						<input
							type="checkbox"
							bind:checked={fields[fields.findIndex((f) => f.id === sf.id)].show_in_list}
						/>
						{t().apps.showInList}
					</label>
				</div>

				{#if hasOptions(sf.type)}
					<div class="settings-field">
						<div class="settings-label">{t().apps.options}</div>
						{#each sf.options ?? [] as opt (opt.id)}
							<div class="option-row">
								<input
									class="settings-input option-input"
									type="text"
									bind:value={fields[fields.findIndex((f) => f.id === sf.id)].options![
										(sf.options ?? []).findIndex((o) => o.id === opt.id)
									].label}
									placeholder={t().apps.optionLabelPlaceholder}
								/>
								<button
									type="button"
									class="remove-opt-btn"
									onclick={() => removeOption(sf, opt.id)}
									aria-label="Remove option"
								>
									<X size={12} />
								</button>
							</div>
						{/each}
						<button type="button" class="add-opt-btn" onclick={() => addOption(sf)}>
							<Plus size={13} /> {t().apps.addOption}
						</button>
					</div>
				{/if}
			{:else}
				<div class="settings-empty">
					<OctagonAlert size={20} />
					<p>{t().apps.selectField}</p>
				</div>
			{/if}
		</div>
	</div>
</form>

<ConfirmDialog
	open={showDeleteDialog}
	title={t().apps.delete}
	message={t().apps.deleteConfirm}
	confirmLabel={t().apps.delete}
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
	.build-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		margin: calc(-1 * var(--space-2xl));
		overflow: hidden;
	}

	.topbar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: 0 var(--space-lg);
		height: var(--header-height);
		border-bottom: 1px solid var(--color-border-light);
		background-color: var(--color-bg-elevated);
		flex-shrink: 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
		&:hover { color: var(--color-text); }
	}

	.app-name-wrap { flex: 1; min-width: 0; }

	.app-name-input {
		width: 100%;
		height: 34px;
		padding: 0 var(--space-sm);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
		font-family: inherit;

		&:hover { border-color: var(--color-border); }
		&:focus { outline: none; border-color: var(--color-border-focus); background-color: var(--color-input-bg); }
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.saved-hint {
		font-size: 0.8125rem;
		color: var(--color-success);
		font-weight: 500;
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		height: 32px;
		padding: 0 var(--space-lg);
		background-color: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;

		&:hover { background-color: var(--color-primary-hover); }
	}

	.delete-btn-top {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;

		&:hover { background-color: var(--color-danger-light); color: var(--color-danger); border-color: var(--color-danger); }
	}

	.build-body {
		display: grid;
		grid-template-columns: 180px 1fr 260px;
		flex: 1;
		overflow: hidden;
	}

	/* Palette */
	.palette {
		border-right: 1px solid var(--color-border-light);
		background-color: var(--color-bg-sunken);
		padding: var(--space-md);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.palette-title {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: var(--space-xs) var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.palette-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
		transition: all var(--transition-fast);

		&:hover { background-color: var(--color-hover); color: var(--color-text); }
	}

	/* Canvas */
	.field-canvas {
		overflow-y: auto;
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		background-color: var(--color-bg);
	}

	.canvas-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		height: 200px;
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-tertiary);
		font-size: 0.875rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		user-select: none;

		&:hover { border-color: var(--color-primary); }
		&.selected { border-color: var(--color-primary); background-color: var(--color-primary-light); }
		&.drag-over { border-color: var(--color-primary); border-style: dashed; }
	}

	.drag-handle { color: var(--color-text-tertiary); cursor: grab; flex-shrink: 0; }
	.field-label { flex: 1; font-size: 0.875rem; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.field-type-tag { font-size: 0.6875rem; color: var(--color-text-tertiary); background-color: var(--color-bg-sunken); padding: 2px var(--space-xs); border-radius: 4px; white-space: nowrap; }
	.required-star { color: var(--color-danger); font-weight: 700; font-size: 0.875rem; }

	.remove-field-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--transition-fast);

		.field-row:hover & { opacity: 1; }
		&:hover { background-color: var(--color-danger-light); color: var(--color-danger); }
	}

	/* Settings panel */
	.field-settings {
		border-left: 1px solid var(--color-border-light);
		background-color: var(--color-bg-elevated);
		padding: var(--space-lg);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.settings-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.settings-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-xl);
		color: var(--color-text-tertiary);
		font-size: 0.8125rem;
		text-align: center;
	}

	.settings-field { display: flex; flex-direction: column; gap: var(--space-xs); }
	.settings-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); }

	.settings-input {
		height: 34px;
		padding: 0 var(--space-sm);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-family: inherit;
		width: 100%;

		&:focus { outline: none; border-color: var(--color-border-focus); box-shadow: 0 0 0 3px var(--color-primary-light); }
	}

	.settings-toggles { display: flex; flex-direction: column; gap: var(--space-sm); }
	.toggle-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.8125rem;
		cursor: pointer;
		input { accent-color: var(--color-primary); }
	}

	.option-row { display: flex; gap: var(--space-xs); margin-bottom: 4px; }
	.option-input { flex: 1; }

	.remove-opt-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 34px;
		border: none;
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		flex-shrink: 0;

		&:hover { color: var(--color-danger); }
	}

	.add-opt-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 28px;
		padding: 0 var(--space-sm);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		cursor: pointer;
		font-family: inherit;

		&:hover { border-color: var(--color-primary); color: var(--color-primary); }
	}
</style>
