<script lang="ts">
	import { enhance } from '$app/forms';
	import { Upload } from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		action: string;
		maxSizeMb?: number;
		accept?: string;
		oncancel?: () => void;
		onuploaded?: () => void;
	}

	let {
		open = $bindable(false),
		action,
		maxSizeMb = 10,
		accept = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv',
		oncancel,
		onuploaded
	}: Props = $props();

	let uploadFile = $state<File | null>(null);
	let uploadError = $state('');
	let isUploading = $state(false);
	let isDragging = $state(false);

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function validateAndSetFile(file: File | null) {
		uploadFile = null;
		uploadError = '';
		if (!file) return;
		if (file.size > maxSizeMb * 1024 * 1024) {
			uploadError = t().fileUpload.errorSize.replace('{size}', String(maxSizeMb));
			return;
		}
		uploadFile = file;
	}

	function handleFileChange(e: Event) {
		validateAndSetFile((e.target as HTMLInputElement).files?.[0] ?? null);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
			isDragging = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		validateAndSetFile(e.dataTransfer?.files?.[0] ?? null);
	}

	function handleClose() {
		uploadFile = null;
		uploadError = '';
		open = false;
		oncancel?.();
	}
</script>

<Modal bind:open title={t().fileUpload.title} onclose={handleClose} size="sm">
	<form
		method="POST"
		{action}
		enctype="multipart/form-data"
		use:enhance={({ formData }) => {
			if (uploadFile) formData.set('file', uploadFile, uploadFile.name);
			isUploading = true;
			return async ({ result }) => {
				isUploading = false;
				if (result.type === 'success') {
					uploadFile = null;
					uploadError = '';
					open = false;
					onuploaded?.();
				}
			};
		}}
	>
		<div class="upload-form">
			<label class="file-input-label">
				<input
					type="file"
					name="file"
					class="file-input"
					{accept}
					onchange={handleFileChange}
				/>
				<div
					class="file-drop-area"
					class:is-dragging={isDragging}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					role="button"
					tabindex="0"
				>
					<Upload size={32} />
					{#if uploadFile}
						<span class="selected-file">{uploadFile.name}</span>
						<span class="selected-size">{formatFileSize(uploadFile.size)}</span>
					{:else if isDragging}
						<span>{t().fileUpload.dragDrop}</span>
					{:else}
						<span>{t().fileUpload.dragDrop}</span>
						<span class="upload-hint">
							{t().fileUpload.hint.replace('{size}', String(maxSizeMb))}
						</span>
					{/if}
				</div>
			</label>
			{#if uploadError}
				<p class="upload-error">{uploadError}</p>
			{/if}
		</div>

		<div class="modal-actions">
			<Button type="button" variant="secondary" onclick={handleClose}>
				{t().common.cancel}
			</Button>
			<Button
				type="submit"
				variant="primary"
				disabled={!uploadFile || !!uploadError || isUploading}
			>
				{isUploading ? t().fileUpload.uploading : t().fileUpload.upload}
			</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.file-input-label {
		display: block;
		cursor: pointer;
		margin-bottom: var(--space-md);
	}

	.file-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	.file-drop-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-xl);
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all 0.15s;
		cursor: pointer;

		&:hover,
		&.is-dragging {
			border-color: var(--color-primary);
			color: var(--color-primary);
			background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
		}
	}

	.selected-file {
		font-weight: 500;
		color: var(--color-text);
		word-break: break-all;
		text-align: center;
	}

	.selected-size {
		font-size: 0.75rem;
	}

	.upload-hint {
		font-size: 0.75rem;
	}

	.upload-error {
		color: var(--color-danger);
		font-size: 0.875rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-md);
	}
</style>
