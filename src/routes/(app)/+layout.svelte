<script lang="ts">
	import { Sidebar, ConfirmDialog } from '$lib/ui';
	import type { NavItem } from '$lib/ui';
	import { getTheme, setTheme } from '$lib/theme.svelte';
	import { t, setLocale, type Locale } from '$lib/i18n';
	import type { LayoutData } from './$types';
	import {
		LayoutDashboard,
		Users,
		FolderKanban,
		CheckSquare,
		AppWindow,
		Shield,
		CircleUser,
		Settings,
		LogOut
	} from '@lucide/svelte';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Initialize locale from server cookie (prevents language FOUC on SSR)
	setLocale(data.locale as Locale);

	let showSignOutConfirm = $state(false);

	// Reactive: re-derives when locale changes
	const primaryNavItems = $derived<NavItem[]>([
		{ href: '/', label: t().nav.dashboard, icon: LayoutDashboard },
		{ href: '/customers', label: t().nav.customers, icon: Users },
		{ href: '/projects', label: t().nav.projects, icon: FolderKanban },
		{ href: '/workflows', label: t().nav.workflows, icon: CheckSquare },
		{ href: '/apps', label: t().nav.apps, icon: AppWindow },
		{ href: '/accounts', label: t().nav.accounts, icon: Shield, adminOnly: true }
	]);

	const secondaryNavItems = $derived<NavItem[]>([
		{ href: '/profile', label: t().nav.profile, icon: CircleUser },
		{ href: '/settings', label: t().nav.settings, icon: Settings, adminOnly: true },
		{
			href: '/logout',
			label: t().nav.signOut,
			icon: LogOut,
			onclick: () => (showSignOutConfirm = true)
		}
	]);
</script>

<div class="app-shell">
	<Sidebar
		{primaryNavItems}
		{secondaryNavItems}
		theme={getTheme()}
		onthemechange={setTheme}
		role={data.user?.role}
	>
		{#snippet logo()}
			<span class="logo-text">Cork</span>
		{/snippet}
	</Sidebar>

	<main class="main-content">
		{@render children()}
	</main>
</div>

<ConfirmDialog
	open={showSignOutConfirm}
	title={t().auth.signOut}
	message={t().auth.signOutConfirm}
	confirmLabel={t().auth.signOut}
	onconfirm={() => {
		window.location.href = '/logout';
	}}
	oncancel={() => (showSignOutConfirm = false)}
/>

<style lang="scss">
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.main-content {
		flex: 1;
		margin-left: var(--sidebar-width);
		padding: var(--space-2xl);
		min-width: 0;
		transition: margin-left var(--transition-base);

		@media (max-width: 768px) {
			margin-left: 0;
			padding: var(--space-lg);
			padding-top: calc(var(--header-height) + var(--space-sm));
		}
	}

	.logo-text {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--sidebar-text-active);
		white-space: nowrap;
		letter-spacing: -0.02em;
	}
</style>
