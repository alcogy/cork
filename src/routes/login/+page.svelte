<script lang="ts">
	import { Button, Input, Label } from '$lib/ui';
	import { getTheme, setTheme, type Theme } from '$lib/theme.svelte';
	import { t, getLocale, setLocale, LOCALES, type Locale } from '$lib/i18n';
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const themeIcons: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
	let ThemeIcon = $derived(themeIcons[getTheme()]);

	function cycleTheme() {
		const order: Theme[] = ['light', 'dark', 'system'];
		const idx = order.indexOf(getTheme());
		setTheme(order[(idx + 1) % order.length]);
	}
</script>

<svelte:head>
	<title>{t().auth.signIn} — Limerick</title>
</svelte:head>

<div class="login-page">
	<div class="login-controls">
		<div class="locale-switcher">
			{#each LOCALES as locale (locale.value)}
				<button
					type="button"
					class="locale-tab {getLocale() === locale.value ? 'active' : ''}"
					onclick={() => setLocale(locale.value)}
				>
					{locale.nativeLabel}
				</button>
			{/each}
		</div>
		<button class="theme-toggle" onclick={cycleTheme} aria-label="Toggle theme">
			<ThemeIcon size={16} />
		</button>
	</div>

	<div class="login-card">
		<div class="login-header">
			<h1 class="login-title">Limerick</h1>
			<p class="login-subtitle">{t().auth.signIn}</p>
		</div>

		<form method="POST" class="login-form">
			{#if form?.error}
				<div class="login-error" role="alert">{form.error}</div>
			{/if}

			<div class="field">
				<Label for="email" required>{t().auth.email}</Label>
				<Input
					id="email"
					type="email"
					name="email"
					placeholder={t().auth.emailPlaceholder}
					autocomplete="email"
					required
				/>
			</div>

			<div class="field">
				<Label for="password" required>{t().auth.password}</Label>
				<Input
					id="password"
					type="password"
					name="password"
					placeholder={t().auth.passwordPlaceholder}
					autocomplete="current-password"
					required
				/>
			</div>

			<Button type="submit" variant="primary" size="lg">{t().auth.signIn}</Button>
		</form>
	</div>
</div>

<style lang="scss">
	.login-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-lg);
		position: relative;
	}

	.login-controls {
		position: absolute;
		top: var(--space-lg);
		right: var(--space-lg);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.locale-switcher {
		display: flex;
		gap: 1px;
		background-color: var(--color-bg-sunken);
		padding: 2px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-light);
	}

	.locale-tab {
		padding: 4px var(--space-md);
		border: none;
		background: none;
		border-radius: calc(var(--radius-md) - 2px);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-family: inherit;
		transition: all var(--transition-fast);

		&.active {
			background-color: var(--color-bg-elevated);
			color: var(--color-text);
			box-shadow: var(--shadow-sm);
		}
	}

	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background-color: var(--color-hover);
			color: var(--color-text);
		}
	}

	.login-card {
		width: 100%;
		max-width: 380px;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		padding: var(--space-2xl);
	}

	.login-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.login-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.login-subtitle {
		margin-top: var(--space-xs);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.login-error {
		padding: var(--space-md);
		background-color: var(--color-danger-light);
		color: var(--color-danger);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
</style>
