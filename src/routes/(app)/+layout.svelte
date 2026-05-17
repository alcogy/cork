<script lang="ts">
	import { Sidebar, ConfirmDialog } from '$lib/ui';
	import type { NavItem } from '$lib/ui';
	import { getTheme, setTheme } from '$lib/theme.svelte';
	import type { LayoutData } from './$types';
	import {
		LayoutDashboard,
		Users,
		CalendarDays,
		FolderKanban,
		CheckSquare,
		AppWindow,
		Shield,
		CircleUser,
		Settings,
		LogOut
	} from '@lucide/svelte';

	let { children, data }: { children: any; data: LayoutData } = $props();

	let showSignOutConfirm = $state(false);

	const primaryNavItems: NavItem[] = [
		{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/customers', label: 'Customers', icon: Users },
		{ href: '/schedules', label: 'Schedules', icon: CalendarDays },
		{ href: '/projects', label: 'Projects', icon: FolderKanban },
		{ href: '/workflows', label: 'Approvals', icon: CheckSquare },
		{ href: '/apps', label: 'Apps', icon: AppWindow },
		{ href: '/accounts', label: 'Accounts', icon: Shield, adminOnly: true },
		{ href: '/settings', label: 'Settings', icon: Settings, adminOnly: true }
	];

	const secondaryNavItems: NavItem[] = [
		{ href: '/profile', label: 'Profile', icon: CircleUser },
		{
			href: '/logout',
			label: 'Sign out',
			icon: LogOut,
			onclick: () => (showSignOutConfirm = true)
		}
	];
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
	title="Sign out"
	message="Are you sure you want to sign out?"
	confirmLabel="Sign out"
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
