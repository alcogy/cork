<script lang="ts">
	import { Button, Input } from '$lib/ui';
	import { Plus, Trash2, Globe, Sun, Moon, Monitor, Palette, Mail, Send, CircleCheck, CircleAlert } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { t, getLocale, setLocale, LOCALES } from '$lib/i18n';
	import { getTheme, setTheme } from '$lib/theme.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);
	let testSending = $state(false);

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

	function enhTest() {
		return () => {
			testSending = true;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				testSending = false;
			};
		};
	}

</script>

<svelte:head>
	<title>{t().settings.title} — Cork</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">{t().settings.title}</h1>
	<p class="page-desc">{t().settings.adminOnly}</p>

	<!-- Appearance -->
	<section class="settings-section">
		<h2><Palette size={16} /> {t().settings.appearance}</h2>
		<div class="settings-card">
			<div class="setting-row">
				<div class="setting-info">
					<div class="setting-label">{t().settings.theme}</div>
					<div class="setting-desc">{t().settings.themeDesc}</div>
				</div>
				<div class="setting-control">
					<div class="locale-buttons">
						<button
							type="button"
							class="locale-btn {getTheme() === 'light' ? 'active' : ''}"
							onclick={() => setTheme('light')}
						>
							<Sun size={14} /> {t().settings.themeLight}
						</button>
						<button
							type="button"
							class="locale-btn {getTheme() === 'dark' ? 'active' : ''}"
							onclick={() => setTheme('dark')}
						>
							<Moon size={14} /> {t().settings.themeDark}
						</button>
						<button
							type="button"
							class="locale-btn {getTheme() === 'system' ? 'active' : ''}"
							onclick={() => setTheme('system')}
						>
							<Monitor size={14} /> {t().settings.themeSystem}
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Language -->
	<section class="settings-section">
		<h2><Globe size={16} /> {t().settings.language}</h2>
		<div class="settings-card">
			<div class="setting-row">
				<div class="setting-info">
					<div class="setting-label">{t().settings.language}</div>
					<div class="setting-desc">{t().settings.languageDesc}</div>
				</div>
				<div class="setting-control">
					<div class="locale-buttons">
						{#each LOCALES as locale (locale.value)}
							<button
								type="button"
								class="locale-btn {getLocale() === locale.value ? 'active' : ''}"
								onclick={() => setLocale(locale.value)}
							>
								{locale.nativeLabel}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Email Notifications -->
	<section class="settings-section">
		<h2><Mail size={16} /> {t().settings.emailNotifications}</h2>
		<div class="settings-card">
			<form method="POST" action="?/saveSetting" use:enhance={enh()} class="setting-row">
				<input type="hidden" name="key" value="alert_email_to" />
				<div class="setting-info">
					<div class="setting-label">{t().settings.alertEmail}</div>
					<div class="setting-desc">{t().settings.alertEmailDesc}</div>
				</div>
				<div class="setting-control">
					<Input
						name="value"
						type="email"
						value={data.settingsMap['alert_email_to'] ?? data.settingsMap['ALERT_EMAIL_TO'] ?? ''}
						placeholder="email@example.com"
						style="width: 220px"
					/>
					<Button type="submit" variant="secondary" size="sm" disabled={saving}>{t().common.save}</Button>
				</div>
			</form>

			<div class="setting-row setting-row--border">
				<div class="setting-info">
					<div class="setting-label">{t().settings.sendTestEmail}</div>
					<div class="setting-desc">
						{#if !data.hasEmailBinding}
							<span class="badge badge--warn">{t().settings.noEmailBinding}</span>
						{:else if form?.testEmailSent}
							<span class="badge badge--ok">
								<CircleCheck size={12} />
								{t().settings.testEmailSent.replace('{email}', form.sentTo ?? '')}
							</span>
						{:else if form?.error && !form?.testEmailSent === undefined}
							<span class="badge badge--err"><CircleAlert size={12} /> {form.error}</span>
						{/if}
					</div>
				</div>
				<div class="setting-control">
					<form method="POST" action="?/sendTestEmail" use:enhance={enhTest()}>
						<Button
							type="submit"
							variant="secondary"
							size="sm"
							disabled={testSending || !data.hasEmailBinding}
						>
							<Send size={13} />
							{testSending ? t().common.loading : t().settings.sendTestEmail}
						</Button>
					</form>
					{#if form?.error && form?.testEmailSent === undefined}
						<span class="badge badge--err"><CircleAlert size={12} /> {form.error}</span>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- General Settings -->
	<section class="settings-section">
		<h2>{t().settings.general}</h2>
		<div class="settings-card">
			<form method="POST" action="?/saveSetting" use:enhance={enh()} class="setting-row">
				<input type="hidden" name="key" value="page_num" />
				<div class="setting-info">
					<div class="setting-label">{t().settings.recordsPerPage}</div>
					<div class="setting-desc">{t().settings.recordsPerPageDesc}</div>
				</div>
				<div class="setting-control">
					<Input name="value" type="number" value={data.settingsMap['page_num'] ?? '30'} style="width: 80px" />
					<Button type="submit" variant="secondary" size="sm" disabled={saving}>{t().common.save}</Button>
				</div>
			</form>
		</div>
	</section>

	<!-- Project Statuses -->
	<section class="settings-section">
		<h2>{t().settings.projectStatuses}</h2>
		<div class="settings-card">
			{#each data.projectStatuses as status (status.id)}
				<div class="list-row">
					<span class="status-dot" style="background-color: {status.color}"></span>
					<span class="list-label">{status.label}</span>
					<form method="POST" action="?/deleteProjectStatus" use:enhance={enh()}>
						<input type="hidden" name="id" value={status.id} />
						<button type="submit" class="del-btn" aria-label="Delete" disabled={saving}>
							<Trash2 size={13} />
						</button>
					</form>
				</div>
			{/each}
			<form method="POST" action="?/addProjectStatus" use:enhance={enh()} class="add-row">
				<input name="label" class="inline-input" placeholder="{t().settings.addStatus}..." required />
				<input name="color" type="color" class="color-input" value="#94a3b8" />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<Plus size={13} /> {t().common.add}
				</Button>
			</form>
		</div>
	</section>

	<!-- Project Categories -->
	<section class="settings-section">
		<h2>{t().settings.projectCategories}</h2>
		<div class="settings-card">
			{#each data.projectCategories as cat (cat.id)}
				<div class="list-row">
					<span class="list-label">{cat.label}</span>
					<form method="POST" action="?/deleteProjectCategory" use:enhance={enh()}>
						<input type="hidden" name="id" value={cat.id} />
						<button type="submit" class="del-btn" aria-label="Delete" disabled={saving}>
							<Trash2 size={13} />
						</button>
					</form>
				</div>
			{/each}
			<form method="POST" action="?/addProjectCategory" use:enhance={enh()} class="add-row">
				<input name="label" class="inline-input" placeholder="{t().settings.addCategory}..." required />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<Plus size={13} /> {t().common.add}
				</Button>
			</form>
		</div>
	</section>

	<!-- Workflow Categories -->
	<section class="settings-section">
		<h2>{t().settings.workflowCategories}</h2>
		<div class="settings-card">
			{#each data.workflowCategories as cat (cat.id)}
				<div class="list-row">
					<span class="status-dot" style="background-color: {cat.color}"></span>
					<span class="list-label">{cat.label}</span>
					<form method="POST" action="?/deleteWorkflowCategory" use:enhance={enh()}>
						<input type="hidden" name="id" value={cat.id} />
						<button type="submit" class="del-btn" aria-label="Delete" disabled={saving}>
							<Trash2 size={13} />
						</button>
					</form>
				</div>
			{/each}
			<form method="POST" action="?/addWorkflowCategory" use:enhance={enh()} class="add-row">
				<input name="label" class="inline-input" placeholder="{t().settings.addCategory}..." required />
				<input name="color" type="color" class="color-input" value="#6b7280" />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<Plus size={13} /> {t().common.add}
				</Button>
			</form>
		</div>
	</section>
</div>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-2xl); max-width: 720px; }
	.page-title { font-size: 1.5rem; font-weight: 700; }
	.page-desc { font-size: 0.875rem; color: var(--color-text-secondary); }

	.settings-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		h2 {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-size: 1rem;
			font-weight: 600;
		}
	}

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

	/* Language switcher */
	.locale-buttons {
		display: flex;
		gap: 2px;
		background-color: var(--color-bg-sunken);
		padding: 3px;
		border-radius: var(--radius-md);
	}

	.locale-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-xl);
		border: none;
		background: none;
		border-radius: calc(var(--radius-md) - 2px);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
		font-family: inherit;

		&.active {
			background-color: var(--color-bg-elevated);
			color: var(--color-text);
			box-shadow: var(--shadow-sm);
		}

		&:hover:not(.active) {
			color: var(--color-text);
		}
	}

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

	.setting-row--border {
		border-top: 1px solid var(--color-border-light);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;

		&--ok  { background: #dcfce7; color: #166534; }
		&--warn { background: #fef9c3; color: #854d0e; }
		&--err  { background: #fee2e2; color: #991b1b; }
	}
</style>
