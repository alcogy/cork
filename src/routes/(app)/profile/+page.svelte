<script lang="ts">
	import { Avatar, Button, Input, Label } from '$lib/ui';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { t } from '$lib/i18n';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);
	let avatarInput = $state<HTMLInputElement | null>(null);
	let uploadingAvatar = $state(false);

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

	function enhAvatar(onDone?: () => void) {
		return () => {
			uploadingAvatar = true;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				await invalidateAll();
				uploadingAvatar = false;
				onDone?.();
			};
		};
	}
</script>

<svelte:head>
	<title>{t().profile.title} — Cork</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">{t().profile.title}</h1>

	<div class="profile-grid">
		<section class="card">
			<h2 class="section-title">{t().profile.accountInfo}</h2>

			<!-- Avatar -->
			<div class="avatar-section">
				<Avatar
					name={data.account?.name ?? ''}
					accountId={data.account?.id}
					avatarKey={data.account?.avatar_key}
					size={72}
				/>
				<div class="avatar-actions">
					<form method="POST" action="?/uploadAvatar" enctype="multipart/form-data" use:enhance={enhAvatar(() => { if (avatarInput) avatarInput.value = ''; })}>
						<input
							bind:this={avatarInput}
							type="file"
							name="avatar"
							accept="image/jpeg,image/png,image/gif,image/webp"
							class="avatar-file-input"
							onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
						/>
						<Button type="button" variant="secondary" size="sm" disabled={uploadingAvatar} onclick={() => avatarInput?.click()}>
							{uploadingAvatar ? t().common.saving : t().profile.uploadAvatar}
						</Button>
					</form>
					{#if data.account?.avatar_key}
						<form method="POST" action="?/deleteAvatar" use:enhance={enhAvatar()}>
							<Button type="submit" variant="ghost" size="sm" disabled={uploadingAvatar}>
								{t().profile.deleteAvatar}
							</Button>
						</form>
					{/if}
					<p class="avatar-hint">{t().profile.avatarHint}</p>
				</div>
			</div>

			{#if form?.error}
				<p class="error-msg">{form.error}</p>
			{/if}
			{#if form?.success}
				<p class="success-msg">{t().profile.savedSuccessfully}</p>
			{/if}
			{#if form?.avatarSuccess}
				<p class="success-msg">{t().profile.avatarUploaded}</p>
			{/if}
			{#if form?.avatarDeleted}
				<p class="success-msg">{t().profile.avatarDeleted}</p>
			{/if}

			<form method="POST" action="?/update" use:enhance={enh()}>
				<div class="fields">
					<div class="field">
						<Label for="prof-name" required>{t().profile.name}</Label>
						<Input
							id="prof-name"
							name="name"
							value={data.account?.name ?? ''}
							placeholder={t().profile.namePlaceholder}
							required
						/>
					</div>

					<div class="field">
						<Label for="prof-email">{t().profile.email}</Label>
						<Input
							id="prof-email"
							name="email"
							type="email"
							value={data.account?.email ?? ''}
							disabled
						/>
						<p class="field-note">{t().profile.emailNote}</p>
					</div>
				</div>

				<div class="divider"></div>

				<h3 class="subsection-title">{t().profile.changePassword}</h3>
				<div class="fields">
					<div class="field">
						<Label for="prof-current-pw">{t().profile.currentPassword}</Label>
						<Input
							id="prof-current-pw"
							name="current_password"
							type="password"
							placeholder={t().profile.currentPasswordHint}
						/>
					</div>

					<div class="field">
						<Label for="prof-new-pw">{t().profile.newPassword}</Label>
						<Input
							id="prof-new-pw"
							name="new_password"
							type="password"
							placeholder={t().profile.newPasswordHint}
						/>
					</div>
				</div>

				<div class="form-actions">
					<Button type="submit" variant="primary" disabled={saving}>
						{saving ? t().common.saving : t().common.saveChanges}
					</Button>
				</div>
			</form>
		</section>

		<section class="card info-card">
			<h2 class="section-title">{t().profile.accountDetails}</h2>
			<dl class="detail-list">
				<div class="detail-row">
					<dt>{t().account.role}</dt>
					<dd>
						<span class="role-badge {data.account?.role === 'admin' ? 'role-admin' : 'role-general'}">
							{data.account?.role === 'admin' ? t().account.roles.admin : t().account.roles.general}
						</span>
					</dd>
				</div>
				<div class="detail-row">
					<dt>{t().profile.memberSince}</dt>
					<dd>{data.account?.created_at?.slice(0, 10) ?? '—'}</dd>
				</div>
			</dl>
		</section>
	</div>
</div>

<style lang="scss">
	.avatar-section {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-light);
	}

	.avatar-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		align-items: flex-start;
	}

	.avatar-file-input {
		display: none;
	}

	.avatar-hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.profile-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: var(--space-lg);
		align-items: start;

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.card {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		margin-top: var(--space-lg);
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--space-lg);
	}

	.subsection-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-bottom: var(--space-md);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-note {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.divider {
		height: 1px;
		background: var(--color-border-light);
		margin: var(--space-lg) 0;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-lg);
	}

	.error-msg {
		color: var(--color-error);
		font-size: 0.875rem;
		margin-bottom: var(--space-md);
	}

	.success-msg {
		color: var(--color-success);
		font-size: 0.875rem;
		margin-bottom: var(--space-md);
	}

	.detail-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.detail-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		dt {
			font-size: 0.75rem;
			color: var(--color-text-muted);
			font-weight: 500;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		dd {
			margin: 0;
			font-size: 0.875rem;
		}
	}

	.role-badge {
		display: inline-block;
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
</style>
