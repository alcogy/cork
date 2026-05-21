<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { page } from '$app/state';
	import { PanelLeftClose, PanelLeftOpen, ChevronDown } from '@lucide/svelte';

	export interface NavItem {
		href: string;
		label: string;
		icon: Component;
		adminOnly?: boolean;
		onclick?: () => void;
	}

	export interface BookmarkItem {
		app_id: string;
		app_name: string;
	}

	interface Props {
		primaryNavItems: NavItem[];
		secondaryNavItems: NavItem[];
		role?: 'admin' | 'general';
		logo?: Snippet;
		bookmarks?: BookmarkItem[];
	}

	let {
		primaryNavItems,
		secondaryNavItems,
		role = 'general',
		logo,
		bookmarks = []
	}: Props = $props();

	let collapsed = $state(false);
	let mobileOpen = $state(false);
	let bookmarksOpen = $state(true);

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	function isAppActive(appId: string): boolean {
		return page.url.pathname.startsWith(`/apps/${appId}`);
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<button class="mobile-toggle" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Toggle menu">
	{#if mobileOpen}
		<PanelLeftClose size={20} />
	{:else}
		<PanelLeftOpen size={20} />
	{/if}
</button>

{#if mobileOpen}
	<button class="sidebar-overlay" onclick={closeMobile} aria-label="Close menu" tabindex="-1"></button>
{/if}

<aside class="sidebar" class:collapsed class:mobile-open={mobileOpen}>
	<div class="sidebar-logo">
		{#if logo}
			{@render logo()}
		{:else}
			<span class="logo-text">Cork</span>
		{/if}
	</div>

	<nav class="sidebar-nav">
		<div class="nav-group">
			{#each primaryNavItems as item (item.href)}
				{#if !item.adminOnly || role === 'admin'}
					{#if item.href === '/apps' && bookmarks.length > 0 && !collapsed}
						<!-- Apps with bookmark children -->
						<div class="bookmark-section">
							<button
								type="button"
								class="nav-item bookmark-header"
								class:active={isActive(item.href)}
								onclick={() => (bookmarksOpen = !bookmarksOpen)}
							>
								<item.icon size={18} />
								<span class="nav-label bookmark-label">{item.label}</span>
								<span class="chevron" class:rotated={bookmarksOpen}>
									<ChevronDown size={14} />
								</span>
							</button>

							{#if bookmarksOpen}
								<div class="bookmark-list">
									<a
										href="/apps"
										class="bookmark-item bookmark-item--all"
										class:active={page.url.pathname === '/apps'}
										onclick={closeMobile}
									>
										{item.label}
									</a>
									{#each bookmarks as b (b.app_id)}
										<a
											href="/apps/{b.app_id}"
											class="bookmark-item"
											class:active={isAppActive(b.app_id)}
											onclick={closeMobile}
										>
											{b.app_name}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<a
							href={item.href}
							class="nav-item"
							class:active={isActive(item.href)}
							onclick={closeMobile}
						>
							<item.icon size={18} />
							<span class="nav-label">{item.label}</span>
						</a>
					{/if}
				{/if}
			{/each}
		</div>
		<div class="nav-group">
			{#each secondaryNavItems as item (item.href)}
				{#if !item.adminOnly || role === 'admin'}
					<a
						href={item.href}
						class="nav-item"
						class:active={isActive(item.href)}
						onclick={(e) => {
							closeMobile();
							if (item.onclick) {
								e.preventDefault();
								item.onclick();
							}
						}}
					>
						<item.icon size={18} />
						<span class="nav-label">{item.label}</span>
					</a>
				{/if}
			{/each}
		</div>
	</nav>

</aside>

<style lang="scss">
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: var(--sidebar-width);
		background-color: var(--sidebar-bg);
		border-right: 1px solid var(--sidebar-border);
		display: flex;
		flex-direction: column;
		z-index: var(--z-sidebar);
		transition: width var(--transition-base);
		overflow: hidden;

		&.collapsed {
			width: 56px;

			.logo-text,
			.nav-label {
				opacity: 0;
				width: 0;
				overflow: hidden;
			}

			.nav-item {
				justify-content: center;
				padding: var(--space-sm);
			}

		}
	}

	.sidebar-logo {
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 var(--space-lg);
		border-bottom: 1px solid var(--sidebar-border);
		flex-shrink: 0;
	}

	.logo-text {
		font-size: 1rem;
		font-weight: 700;
		color: var(--sidebar-text-active);
		white-space: nowrap;
		transition: opacity var(--transition-base);
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-sm);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		color: var(--sidebar-text);
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 500;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);
		white-space: nowrap;

		&:hover {
			background-color: var(--sidebar-hover);
			color: var(--sidebar-text-active);
			text-decoration: none;
		}

		&.active {
			background-color: var(--sidebar-active);
			color: var(--sidebar-text-active);
		}
	}

	.nav-label {
		transition: opacity var(--transition-base);
	}

	.bookmark-section {
		display: flex;
		flex-direction: column;
	}

	.bookmark-header {
		border: none;
		background: none;
		cursor: pointer;
		width: 100%;
		text-align: left;

		.bookmark-label {
			flex: 1;
			display: flex;
			align-items: center;
		}

		.chevron {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			color: var(--sidebar-text);
			transition: transform var(--transition-fast);

			&.rotated { transform: rotate(180deg); }
		}
	}

	.bookmark-list {
		margin-left: 34px;
		padding: var(--space-xs) 0 var(--space-xs) var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: 2px;
		position: relative;

		&::before {
			content: '';
			position: absolute;
			left: -8px;
			top: 0;
			height: 100%;
			width: 1px;
			background-color: var(--color-border);
		}
	}

	.bookmark-item {
		display: block;
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--sidebar-text);
		text-decoration: none;
		border-radius: var(--radius-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background-color: var(--sidebar-hover);
			color: var(--sidebar-text-active);
		}

		&.active { color: var(--color-primary); }
	}

	.bookmark-empty {
		font-size: 0.75rem;
		color: var(--sidebar-text);
		padding: var(--space-xs) var(--space-sm);
		opacity: 0.6;
	}

	.bookmark-item--all {
		font-weight: 600;
	}


	.mobile-toggle {
		display: none;
		position: fixed;
		top: var(--space-md);
		left: var(--space-md);
		z-index: var(--z-header);
		width: 36px;
		height: 36px;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		cursor: pointer;
	}

	.sidebar-overlay {
		display: none;
		position: fixed;
		inset: 0;
		background-color: var(--color-bg-overlay);
		z-index: calc(var(--z-sidebar) - 1);
		border: none;
		cursor: default;
	}

	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
			width: var(--sidebar-width);

			&.mobile-open {
				transform: translateX(0);
			}

			&.collapsed {
				width: var(--sidebar-width);

				.logo-text,
				.nav-label {
					opacity: 1;
					width: auto;
				}

			}
		}

		.sidebar-logo {
			padding-left: 52px;
		}

		.mobile-toggle {
			display: inline-flex;
		}

		.sidebar-overlay {
			display: block;
		}
	}
</style>
