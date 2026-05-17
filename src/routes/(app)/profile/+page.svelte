<script lang="ts">
	import { Button, Input, Label } from '$lib/ui';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
	<title>Profile — Cork</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">Profile</h1>

	<div class="profile-grid">
		<section class="card">
			<h2 class="section-title">Account info</h2>

			{#if form?.error}
				<p class="error-msg">{form.error}</p>
			{/if}
			{#if form?.success}
				<p class="success-msg">Saved successfully.</p>
			{/if}

			<form method="POST" action="?/update" use:enhance={enh()}>
				<div class="fields">
					<div class="field">
						<Label for="prof-name" required>Name</Label>
						<Input
							id="prof-name"
							name="name"
							value={data.account?.name ?? ''}
							placeholder="Your name"
							required
						/>
					</div>

					<div class="field">
						<Label for="prof-email">Email</Label>
						<Input
							id="prof-email"
							name="email"
							type="email"
							value={data.account?.email ?? ''}
							disabled
						/>
						<p class="field-note">Email cannot be changed here. Contact an admin.</p>
					</div>
				</div>

				<div class="divider"></div>

				<h3 class="subsection-title">Change password</h3>
				<div class="fields">
					<div class="field">
						<Label for="prof-current-pw">Current password</Label>
						<Input
							id="prof-current-pw"
							name="current_password"
							type="password"
							placeholder="Required to set a new password"
						/>
					</div>

					<div class="field">
						<Label for="prof-new-pw">New password</Label>
						<Input
							id="prof-new-pw"
							name="new_password"
							type="password"
							placeholder="Leave blank to keep current"
						/>
					</div>
				</div>

				<div class="form-actions">
					<Button type="submit" variant="primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save changes'}
					</Button>
				</div>
			</form>
		</section>

		<section class="card info-card">
			<h2 class="section-title">Account details</h2>
			<dl class="detail-list">
				<div class="detail-row">
					<dt>Role</dt>
					<dd>
						<span class="role-badge {data.account?.role === 'admin' ? 'role-admin' : 'role-general'}">
							{data.account?.role === 'admin' ? 'Admin' : 'General'}
						</span>
					</dd>
				</div>
				<div class="detail-row">
					<dt>Member since</dt>
					<dd>{data.account?.created_at?.slice(0, 10) ?? '—'}</dd>
				</div>
			</dl>
		</section>
	</div>
</div>

<style lang="scss">
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
		background: var(--color-surface);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
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
