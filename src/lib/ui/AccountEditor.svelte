<script lang="ts">
	import Modal from './Modal.svelte';
	import Input from './Input.svelte';
	import Label from './Label.svelte';
	import Button from './Button.svelte';
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';

	interface AccountData {
		id?: string;
		name: string;
		email: string;
		role: 'admin' | 'general';
	}

	interface Props {
		open: boolean;
		account?: AccountData | null;
		onsave?: () => void;
	}

	let { open = $bindable(false), account, onsave }: Props = $props();

	const isEdit = $derived(!!account?.id);
	const actionUrl = $derived(isEdit ? '?/update' : '?/create');
</script>

<Modal bind:open title={isEdit ? t().account.edit : t().account.new}>
	<form
		class="editor-form"
		method="POST"
		action={actionUrl}
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					open = false;
					onsave?.();
				}
				await update();
			};
		}}
	>
		{#if isEdit && account?.id}
			<input type="hidden" name="id" value={account.id} />
		{/if}

		<div class="field">
			<Label for="acct-name" required>{t().account.name}</Label>
			<Input
				id="acct-name"
				name="name"
				value={account?.name || ''}
				required
			/>
		</div>

		<div class="field">
			<Label for="acct-email" required>{t().account.email}</Label>
			<Input
				id="acct-email"
				name="email"
				type="email"
				value={account?.email || ''}
				required
			/>
		</div>

		<div class="field">
			<Label for="acct-role" required>{t().account.role}</Label>
			<select id="acct-role" name="role" class="select" value={account?.role || 'general'}>
				<option value="general">{t().account.roles.general}</option>
				<option value="admin">{t().account.roles.admin}</option>
			</select>
		</div>

		<div class="field">
			<Label for="acct-password">{isEdit ? t().account.newPassword : t().account.password}</Label>
			<Input
				id="acct-password"
				name="password"
				type="password"
				required={!isEdit}
			/>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (open = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary">{isEdit ? t().common.save : t().common.create}</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.editor-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.select {
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
	}
</style>
