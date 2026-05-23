<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button, Input, Pagination } from '$lib/ui';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let filterUser = $state(page.url.searchParams.get('user') ?? '');
	let filterAction = $state(page.url.searchParams.get('action') ?? '');
	let filterResource = $state(page.url.searchParams.get('resource') ?? '');

	const ACTIONS = ['create', 'update', 'delete', 'login', 'login_failed', 'logout', 'export', 'import'] as const;
	const RESOURCES = ['customer', 'project', 'workflow', 'account', 'wbs', 'file', 'email', 'app', 'record', 'bookmark', 'session'] as const;

	const ACTION_COLOR: Record<string, string> = {
		create: 'green',
		update: 'blue',
		delete: 'red',
		login: 'teal',
		login_failed: 'red',
		logout: 'gray',
		export: 'orange',
		import: 'orange'
	};

	function buildParams(p: number) {
		const params = new URLSearchParams();
		if (filterUser) params.set('user', filterUser);
		if (filterAction) params.set('action', filterAction);
		if (filterResource) params.set('resource', filterResource);
		params.set('page', String(p));
		return params.toString();
	}

	function handleFilter() {
		goto(`?${buildParams(1)}`, { keepFocus: true });
	}

	function handlePageChange(p: number) {
		goto(`?${buildParams(p)}`);
	}

	function formatDate(s: string) {
		const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
		return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
	}

	function parseDetail(json: string | null): string {
		if (!json) return '';
		try {
			const obj = JSON.parse(json);
			return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' / ');
		} catch {
			return json;
		}
	}

	function actionLabel(action: string): string {
		return (t().auditLog.actions as Record<string, string>)[action] ?? action;
	}

	function resourceLabel(resource: string): string {
		return (t().auditLog.resources as Record<string, string>)[resource] ?? resource;
	}
</script>

<svelte:head>
	<title>{t().auditLog.title} — Cork</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">{t().auditLog.title}</h1>

	<div class="filters">
		<div class="filter-field">
			<Input
				bind:value={filterUser}
				placeholder={t().auditLog.searchUser}
				onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleFilter()}
			/>
		</div>

		<select class="filter-select" bind:value={filterAction} onchange={handleFilter}>
			<option value="">{t().auditLog.allActions}</option>
			{#each ACTIONS as a}
				<option value={a}>{actionLabel(a)}</option>
			{/each}
		</select>

		<select class="filter-select" bind:value={filterResource} onchange={handleFilter}>
			<option value="">{t().auditLog.allResources}</option>
			{#each RESOURCES as r}
				<option value={r}>{resourceLabel(r)}</option>
			{/each}
		</select>

		<Button variant="secondary" size="sm" onclick={handleFilter}>{t().common.search}</Button>
	</div>

	<div class="log-count">{data.total.toLocaleString()} {t().common.rows}</div>

	<div class="table-wrap">
		<table class="log-table">
			<thead>
				<tr>
					<th class="col-date">{t().auditLog.dateTime}</th>
					<th class="col-user">{t().auditLog.user}</th>
					<th class="col-action">{t().auditLog.action}</th>
					<th class="col-target">{t().auditLog.resourceType}</th>
					<th class="col-label">{t().auditLog.resourceId}</th>
					<th class="col-detail">{t().auditLog.detail}</th>
				</tr>
			</thead>
			<tbody>
				{#if data.logs.length === 0}
					<tr>
						<td colspan="6" class="empty-cell">{t().auditLog.noLogs}</td>
					</tr>
				{:else}
					{#each data.logs as log (log.id)}
						<tr>
							<td class="col-date mono">{formatDate(log.created_at)}</td>
							<td class="col-user">{log.account_name ?? '—'}</td>
							<td class="col-action">
								<span class="action-badge action-{ACTION_COLOR[log.action] ?? 'gray'}">
									{actionLabel(log.action)}
								</span>
							</td>
							<td class="col-target">{resourceLabel(log.resource_type)}</td>
							<td class="col-label">{log.resource_id ?? '—'}</td>
							<td class="col-detail muted">{parseDetail(log.metadata)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if data.totalPages > 1}
		<Pagination
			currentPage={data.page}
			totalPages={data.totalPages}
			onpagechange={handlePageChange}
		/>
	{/if}
</div>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.filters {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.filter-field {
		flex: 1;
		min-width: 180px;
		max-width: 240px;
	}

	.filter-select {
		width: 150px;
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		cursor: pointer;

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}

		option {
			background-color: var(--color-bg-elevated);
		}
	}

	.log-count {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
	}

	.log-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;

		th {
			padding: var(--space-sm) var(--space-md);
			text-align: left;
			font-weight: 600;
			color: var(--color-text-secondary);
			border-bottom: 1px solid var(--color-border-light);
			background-color: var(--color-bg-sunken);
			white-space: nowrap;
		}

		td {
			padding: var(--space-sm) var(--space-md);
			border-bottom: 1px solid var(--color-border-light);
			vertical-align: middle;
		}

		tr:last-child td {
			border-bottom: none;
		}
	}

	.col-date   { width: 160px; }
	.col-user   { width: 100px; }
	.col-action { width: 125px; }
	.col-target { width: 120px; }
	.col-label  { width: 200px; }
	.col-detail { flex: 1; }

	.mono {
		font-variant-numeric: tabular-nums;
		font-size: 0.75rem;
	}

	.muted {
		color: var(--color-text-secondary);
	}

	.empty-cell {
		text-align: center;
		padding: var(--space-3xl) !important;
		color: var(--color-text-tertiary);
	}

	.action-badge {
		display: inline-flex;
		padding: 2px 8px;
		border-radius: var(--radius-full, 999px);
		font-size: 0.75rem;
		font-weight: 500;

		&.action-green  { background-color: var(--color-success-light); color: var(--color-success); }
		&.action-blue   { background-color: var(--color-primary-light); color: var(--color-primary); }
		&.action-red    { background-color: var(--color-danger-bg);     color: var(--color-danger); }
		&.action-orange { background-color: var(--color-warning-light); color: var(--color-warning); }
		&.action-teal   { background-color: #ccfbf1; color: #0f766e; }
		&.action-gray   { background-color: var(--color-bg-sunken);     color: var(--color-text-secondary); }
	}
</style>
