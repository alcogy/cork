<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Modal, Input, Label, Textarea, ConfirmDialog } from '$lib/ui';
	import { PROJECT_PRIORITIES, PROJECT_PRIORITY_LABELS } from '$lib/domain/project/types';
	import { ArrowLeft, Plus, Trash2, UserPlus, UserMinus, MessageSquare } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDate, formatDateTime } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'overview' | 'kanban' | 'wbs' | 'members' | 'activity';
	let activeTab = $state<Tab>('overview');
	let showEdit = $state(false);
	let showAddTask = $state(false);
	let showCreateWbs = $state(false);
	let saving = $state(false);

	function enh(opts: { close?: () => void } = {}) {
		return () => {
			saving = true;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				await invalidateAll();
				opts.close?.();
				saving = false;
			};
		};
	}

	const kanbanCols = [
		{ key: 'todo', label: 'To Do', color: '#94a3b8' },
		{ key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
		{ key: 'done', label: 'Done', color: '#10b981' }
	] as const;

	const tasksByStatus = $derived(() => {
		const tasks = data.wbs?.tasks ?? [];
		return {
			todo: tasks.filter((t) => t.status === 'todo'),
			in_progress: tasks.filter((t) => t.status === 'in_progress'),
			done: tasks.filter((t) => t.status === 'done')
		};
	});

	const priorityColor: Record<string, string> = {
		low: 'var(--color-text-tertiary)',
		medium: 'var(--color-info)',
		high: 'var(--color-warning)',
		urgent: 'var(--color-danger)'
	};
</script>

<svelte:head>
	<title>{data.project.title} — Limerick</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/projects" class="back-link"><ArrowLeft size={16} /> Projects</a>
	</div>

	<div class="project-header">
		<div class="project-info">
			<h1>{data.project.title}</h1>
			<div class="project-badges">
				{#if data.project.status}
					<span class="status-badge" style="background-color: {data.project.status.color}20; color: {data.project.status.color}; border: 1px solid {data.project.status.color}40">
						{data.project.status.label}
					</span>
				{/if}
				<span class="priority-badge" style="color: {priorityColor[data.project.priority]}">
					{PROJECT_PRIORITY_LABELS[data.project.priority]}
				</span>
			</div>
		</div>
		{#if data.isOwner}
			<Button variant="secondary" size="sm" onclick={() => (showEdit = true)}>Edit</Button>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="tabs">
		{#each (['overview', 'kanban', 'wbs', 'members', 'activity'] as Tab[]) as tab (tab)}
			<button class="tab {activeTab === tab ? 'active' : ''}" onclick={() => (activeTab = tab)}>
				{tab === 'overview' ? 'Overview' : tab === 'kanban' ? 'Kanban' : tab === 'wbs' ? 'WBS' : tab === 'members' ? `Members (${data.project.members.length})` : 'Activity'}
			</button>
		{/each}
	</div>

	<!-- Overview Tab -->
	{#if activeTab === 'overview'}
		<div class="tab-content">
			<div class="overview-grid">
				<div class="info-card">
					<h3>Details</h3>
					<dl class="detail-list">
						{#if data.project.category}
							<div class="detail-row">
								<dt>Category</dt>
								<dd>{data.project.category.label}</dd>
							</div>
						{/if}
						{#if data.project.start_date}
							<div class="detail-row">
								<dt>Start date</dt>
								<dd>{formatDate(data.project.start_date)}</dd>
							</div>
						{/if}
						{#if data.project.end_date}
							<div class="detail-row">
								<dt>Due date</dt>
								<dd>{formatDate(data.project.end_date)}</dd>
							</div>
						{/if}
						<div class="detail-row">
							<dt>Created by</dt>
							<dd>{data.project.creator?.name ?? '—'}</dd>
						</div>
						<div class="detail-row">
							<dt>Created</dt>
							<dd>{formatDate(data.project.created_at)}</dd>
						</div>
					</dl>
				</div>

				{#if data.project.description}
					<div class="info-card">
						<h3>Description</h3>
						<p class="description">{data.project.description}</p>
					</div>
				{/if}

				<div class="info-card">
					<h3>Quick stats</h3>
					<div class="stats-row">
						<div class="stat">
							<span class="stat-value">{data.project.members.length}</span>
							<span class="stat-label">Members</span>
						</div>
						<div class="stat">
							<span class="stat-value">{data.wbs?.tasks.length ?? 0}</span>
							<span class="stat-label">Tasks</span>
						</div>
						<div class="stat">
							<span class="stat-value">{data.wbs?.tasks.filter((t) => t.status === 'done').length ?? 0}</span>
							<span class="stat-label">Done</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Kanban Tab -->
	{#if activeTab === 'kanban'}
		<div class="tab-content">
			{#if data.wbs}
				<div class="kanban-actions">
					<Button variant="primary" size="sm" onclick={() => (showAddTask = true)}>
						<Plus size={14} /> Add task
					</Button>
				</div>
				<div class="kanban-board">
					{#each kanbanCols as col (col.key)}
						<div class="kanban-col">
							<div class="kanban-col-header" style="border-top: 3px solid {col.color}">
								<span>{col.label}</span>
								<span class="col-count">{tasksByStatus()[col.key].length}</span>
							</div>
							<div class="kanban-tasks">
								{#each tasksByStatus()[col.key] as task (task.id)}
									<div class="kanban-card">
										<div class="kanban-card-name">{task.name}</div>
										{#if task.assignee}
											<div class="kanban-card-assignee">{task.assignee.name}</div>
										{/if}
										{#if task.planned_end}
											<div class="kanban-card-date">{formatDate(task.planned_end)}</div>
										{/if}
										<div class="kanban-card-actions">
											{#if col.key !== 'todo'}
												<form method="POST" action="?/updateTaskStatus" use:enhance={enh()}>
													<input type="hidden" name="id" value={task.id} />
													<input type="hidden" name="status" value={col.key === 'in_progress' ? 'todo' : 'in_progress'} />
													<button type="submit" class="move-btn" title="Move left">←</button>
												</form>
											{/if}
											{#if col.key !== 'done'}
												<form method="POST" action="?/updateTaskStatus" use:enhance={enh()}>
													<input type="hidden" name="id" value={task.id} />
													<input type="hidden" name="status" value={col.key === 'todo' ? 'in_progress' : 'done'} />
													<button type="submit" class="move-btn" title="Move right">→</button>
												</form>
											{/if}
											<form method="POST" action="?/deleteTask" use:enhance={enh()}>
												<input type="hidden" name="id" value={task.id} />
												<button type="submit" class="del-btn" aria-label="Delete task"><Trash2 size={12} /></button>
											</form>
										</div>
									</div>
								{/each}
								{#if tasksByStatus()[col.key].length === 0}
									<div class="kanban-empty">No tasks</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="wbs-empty">
					<p>No WBS set up yet. Create a WBS to use Kanban.</p>
					<Button variant="primary" size="sm" onclick={() => { activeTab = 'wbs'; }}>
						Go to WBS tab
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- WBS Tab -->
	{#if activeTab === 'wbs'}
		<div class="tab-content">
			{#if data.wbs}
				<div class="wbs-header">
					<div>
						<h3>{data.wbs.title}</h3>
						<p class="wbs-range">{formatDate(data.wbs.start_date)} — {formatDate(data.wbs.end_date)}</p>
					</div>
					<Button variant="primary" size="sm" onclick={() => (showAddTask = true)}>
						<Plus size={14} /> Add task
					</Button>
				</div>

				{#if data.wbs.tasks.length > 0}
					<div class="wbs-task-list">
						{#each data.wbs.tasks as task (task.id)}
							<div class="wbs-task-row">
								<div class="wbs-task-name">{task.name}</div>
								<div class="wbs-task-meta">
									{#if task.assignee}<span>{task.assignee.name}</span>{/if}
									{#if task.planned_start}<span>{formatDate(task.planned_start)}</span>{/if}
									{#if task.planned_end}<span>→ {formatDate(task.planned_end)}</span>{/if}
								</div>
								<span class="task-status status-{task.status}">{task.status.replace('_', ' ')}</span>
								<div class="wbs-task-progress">
									<div class="progress-bar">
										<div class="progress-fill" style="width: {task.progress}%"></div>
									</div>
									<span>{task.progress}%</span>
								</div>
								<form method="POST" action="?/deleteTask" use:enhance={enh()}>
									<input type="hidden" name="id" value={task.id} />
									<button type="submit" class="del-btn" aria-label="Delete task"><Trash2 size={12} /></button>
								</form>
							</div>
						{/each}
					</div>
				{:else}
					<div class="wbs-empty">
						<p>No tasks yet. Add tasks to build your WBS.</p>
					</div>
				{/if}
			{:else}
				<div class="wbs-empty">
					<p>No WBS created yet for this project.</p>
					<Button variant="primary" size="sm" onclick={() => (showCreateWbs = true)}>
						<Plus size={14} /> Create WBS
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Members Tab -->
	{#if activeTab === 'members'}
		<div class="tab-content">
			<div class="members-header">
				<h3>Project members</h3>
				{#if data.availableAccounts.length > 0}
					<form method="POST" action="?/addMember" use:enhance={enh()}>
						<div class="add-member-row">
							<select name="account_id" class="select-input" required aria-label="Select member to add">
								<option value="">Select member...</option>
								{#each data.availableAccounts as account (account.id)}
									<option value={account.id}>{account.name}</option>
								{/each}
							</select>
							<Button type="submit" variant="primary" size="sm">
								<UserPlus size={14} /> Add
							</Button>
						</div>
					</form>
				{/if}
			</div>
			<div class="member-list">
				{#each data.project.members as member (member.id)}
					<div class="member-row">
						<div class="member-avatar">{member.account.name.charAt(0).toUpperCase()}</div>
						<div class="member-info">
							<div class="member-name">{member.account.name}</div>
							<div class="member-role">{member.role}</div>
						</div>
						<form method="POST" action="?/removeMember" use:enhance={enh()}>
							<input type="hidden" name="account_id" value={member.account_id} />
							<button type="submit" class="del-btn" aria-label="Remove member"><UserMinus size={14} /></button>
						</form>
					</div>
				{/each}
				{#if data.project.members.length === 0}
					<p class="empty">No members assigned yet.</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Activity Tab -->
	{#if activeTab === 'activity'}
		<div class="tab-content">
			<form method="POST" action="?/logActivity" use:enhance={enh()} class="activity-form">
				<Textarea name="content" placeholder="Add a comment or note..." rows={3} />
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					<MessageSquare size={14} /> Add comment
				</Button>
			</form>
			<div class="activity-list">
				{#each data.project.activities as act (act.id)}
					<div class="activity-item">
						<div class="activity-avatar">{act.account?.name?.charAt(0).toUpperCase() ?? '?'}</div>
						<div class="activity-body">
							<div class="activity-meta">
								<strong>{act.account?.name ?? 'Unknown'}</strong>
								<span>{formatDateTime(act.created_at)}</span>
							</div>
							<p class="activity-content">{act.content}</p>
						</div>
					</div>
				{/each}
				{#if data.project.activities.length === 0}
					<p class="empty">No activity yet.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Edit Project Modal -->
<Modal open={showEdit} title="Edit project" onclose={() => (showEdit = false)}>
	<form method="POST" action="?/update" use:enhance={enh({ close: () => (showEdit = false) })}>
		<div class="form-fields">
			<div class="field">
				<Label for="title" required>Project name</Label>
				<Input id="title" name="title" value={data.project.title} required />
			</div>
			<div class="field">
				<Label for="description">Description</Label>
				<Textarea id="description" name="description" rows={3} value={data.project.description ?? ''} />
			</div>
			<div class="field-row">
				<div class="field">
					<Label for="status_id">Status</Label>
					<select id="status_id" name="status_id" class="select-input">
						<option value="">— None —</option>
						{#each data.statuses as s (s.id)}
							<option value={s.id} selected={data.project.status_id === s.id}>{s.label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<Label for="priority">Priority</Label>
					<select id="priority" name="priority" class="select-input">
						{#each PROJECT_PRIORITIES as p (p)}
							<option value={p} selected={data.project.priority === p}>{PROJECT_PRIORITY_LABELS[p]}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="field-row">
				<div class="field">
					<Label for="start_date" required>Start date</Label>
					<Input id="start_date" name="start_date" type="date" value={data.project.start_date ?? ''} required />
				</div>
				<div class="field">
					<Label for="end_date" required>End date</Label>
					<Input id="end_date" name="end_date" type="date" value={data.project.end_date ?? ''} required />
				</div>
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEdit = false)}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={saving}>Save changes</Button>
		</div>
	</form>
</Modal>

<!-- Create WBS Modal -->
<Modal open={showCreateWbs} title="Create WBS for this project" onclose={() => (showCreateWbs = false)}>
	<form method="POST" action="?/createWbs" use:enhance={enh({ close: () => (showCreateWbs = false) })}>
		<div class="form-fields">
			<p class="wbs-info">
				WBS will be created using the project's dates:<br />
				<strong>{data.project.start_date ?? '—'} → {data.project.end_date ?? '—'}</strong>
			</p>
			{#if !data.project.start_date || !data.project.end_date}
				<p class="wbs-warn">⚠ Project start date and end date must be set first.</p>
			{/if}
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showCreateWbs = false)}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={saving || !data.project.start_date || !data.project.end_date}>
				Create WBS
			</Button>
		</div>
	</form>
</Modal>

<!-- Add Task Modal -->
<Modal open={showAddTask} title="Add task" onclose={() => (showAddTask = false)}>
	<form method="POST" action="?/addTask" use:enhance={enh({ close: () => (showAddTask = false) })}>
		{#if data.wbs}
			<input type="hidden" name="wbs_id" value={data.wbs.id} />
		{/if}
		<div class="form-fields">
			<div class="field">
				<Label for="task_name" required>Task name</Label>
				<Input id="task_name" name="name" required />
			</div>
			<div class="field">
				<Label for="task_assignee">Assignee</Label>
				<select id="task_assignee" name="assignee_id" class="select-input">
					<option value="">Unassigned</option>
					{#each data.project.members as m (m.account_id)}
						<option value={m.account_id}>{m.account.name}</option>
					{/each}
				</select>
			</div>
			<div class="field-row">
				<div class="field">
					<Label for="task_start">Planned start</Label>
					<Input id="task_start" name="planned_start" type="date" />
				</div>
				<div class="field">
					<Label for="task_end">Planned end</Label>
					<Input id="task_end" name="planned_end" type="date" />
				</div>
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showAddTask = false)}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={saving}>Add task</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-xl); }

	.breadcrumb .back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		&:hover { color: var(--color-text); }
	}

	.project-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);

		h1 { font-size: 1.5rem; }
	}

	.project-badges {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-xs);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.priority-badge {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		gap: 0;
	}

	.tab {
		padding: var(--space-sm) var(--space-lg);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		margin-bottom: -1px;
		transition: all var(--transition-fast);

		&:hover { color: var(--color-text); }
		&.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
	}

	.tab-content { display: flex; flex-direction: column; gap: var(--space-lg); }

	/* Overview */
	.overview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.info-card {
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);

		h3 { font-size: 0.875rem; font-weight: 600; margin-bottom: var(--space-md); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
	}

	.detail-list { display: flex; flex-direction: column; gap: var(--space-sm); }
	.detail-row { display: flex; gap: var(--space-md); font-size: 0.875rem; }
	.detail-row dt { color: var(--color-text-tertiary); min-width: 80px; flex-shrink: 0; }
	.description { font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }

	.stats-row { display: flex; gap: var(--space-xl); }
	.stat { display: flex; flex-direction: column; }
	.stat-value { font-size: 1.5rem; font-weight: 700; }
	.stat-label { font-size: 0.75rem; color: var(--color-text-secondary); }

	/* Kanban */
	.kanban-actions { display: flex; justify-content: flex-end; }

	.kanban-board {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.kanban-col {
		background-color: var(--color-bg-sunken);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.kanban-col-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		background-color: var(--color-bg-elevated);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.col-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 4px;
		background-color: var(--color-bg-sunken);
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.kanban-tasks {
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		min-height: 100px;
	}

	.kanban-card {
		padding: var(--space-md);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.kanban-card-name { font-size: 0.875rem; font-weight: 500; margin-bottom: 4px; }
	.kanban-card-assignee { font-size: 0.75rem; color: var(--color-text-secondary); }
	.kanban-card-date { font-size: 0.75rem; color: var(--color-text-tertiary); margin-top: 2px; }

	.kanban-card-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
	}

	.move-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-sunken);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--color-text-secondary);

		&:hover { background: var(--color-primary-light); color: var(--color-primary); }
	}

	.del-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		margin-left: auto;

		&:hover { background: var(--color-danger-light); color: var(--color-danger); }
	}

	.kanban-empty {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-align: center;
		padding: var(--space-lg);
	}

	/* WBS */
	.wbs-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;

		h3 { font-size: 1rem; font-weight: 600; }
	}

	.wbs-range { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 2px; }

	.wbs-task-list { display: flex; flex-direction: column; gap: 1px; }

	.wbs-task-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
	}

	.wbs-task-name { flex: 1; font-weight: 500; font-size: 0.875rem; min-width: 0; }
	.wbs-task-meta { display: flex; gap: var(--space-sm); font-size: 0.75rem; color: var(--color-text-secondary); }

	.task-status {
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;

		&.status-todo { background: var(--color-bg-sunken); color: var(--color-text-secondary); }
		&.status-in_progress { background: var(--color-warning-light); color: var(--color-warning); }
		&.status-done { background: var(--color-success-light); color: var(--color-success); }
	}

	.wbs-task-progress {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		width: 100px;
		flex-shrink: 0;
	}

	.progress-bar {
		flex: 1;
		height: 6px;
		background-color: var(--color-bg-sunken);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: var(--color-primary);
		border-radius: 3px;
	}

	.wbs-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-3xl);
		text-align: center;
		color: var(--color-text-tertiary);
		background-color: var(--color-bg-elevated);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
	}

	/* Members */
	.members-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);

		h3 { font-size: 1rem; }
	}

	.add-member-row { display: flex; gap: var(--space-sm); align-items: center; }
	.member-list { display: flex; flex-direction: column; gap: var(--space-sm); }

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
	}

	.member-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.member-info { flex: 1; }
	.member-name { font-weight: 500; font-size: 0.875rem; }
	.member-role { font-size: 0.75rem; color: var(--color-text-secondary); text-transform: capitalize; }

	/* Activity */
	.activity-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		align-items: flex-end;
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.activity-list { display: flex; flex-direction: column; gap: var(--space-md); }

	.activity-item {
		display: flex;
		gap: var(--space-md);
	}

	.activity-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background-color: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.8125rem;
		flex-shrink: 0;
	}

	.activity-body { flex: 1; }
	.activity-meta { display: flex; gap: var(--space-md); font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 4px; strong { color: var(--color-text); } }
	.activity-content { font-size: 0.875rem; white-space: pre-wrap; }

	.empty { text-align: center; color: var(--color-text-tertiary); padding: var(--space-xl); }

	/* Form */
	.form-fields { display: flex; flex-direction: column; gap: var(--space-lg); margin-bottom: var(--space-xl); }
	.field { display: flex; flex-direction: column; gap: var(--space-sm); flex: 1; }
	.field-row { display: flex; gap: var(--space-md); }
	.select-input {
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.875rem;
		width: 100%;
	}
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}

	.wbs-info {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.6;
		padding: var(--space-md);
		background-color: var(--color-bg-sunken);
		border-radius: var(--radius-md);
	}

	.wbs-warn {
		font-size: 0.875rem;
		color: var(--color-warning);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-warning-light);
		border-radius: var(--radius-md);
	}
</style>
