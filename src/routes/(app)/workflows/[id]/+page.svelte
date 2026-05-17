<script lang="ts">
	import { Button, Textarea } from '$lib/ui';
	import { WORKFLOW_STATUS_LABELS, WORKFLOW_PRIORITY_LABELS } from '$lib/domain/workflow/types';
	import { ArrowLeft, CheckCircle, XCircle } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDate, formatDateTime } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	const statusColor: Record<string, string> = {
		draft: 'neutral',
		submitted: 'info',
		in_review: 'warning',
		approved: 'success',
		rejected: 'danger',
		cancelled: 'neutral'
	};

	const wf = $derived(data.workflow);
</script>

<svelte:head>
	<title>{data.workflow.title} — Cork</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/workflows" class="back-link"><ArrowLeft size={16} /> Approvals</a>
	</div>

	<div class="workflow-header">
		<div>
			<h1>{wf.title}</h1>
			<div class="workflow-meta">
				<span>by {wf.requester?.name ?? '—'}</span>
				<span>·</span>
				<span>{formatDate(wf.created_at)}</span>
			</div>
		</div>
		<span class="status-badge badge-{statusColor[wf.status] ?? 'neutral'}">
			{WORKFLOW_STATUS_LABELS[wf.status]}
		</span>
	</div>

	<div class="content-grid">
		<!-- Left: Details + Comments -->
		<div class="main-col">
			{#if wf.description}
				<div class="section">
					<h3>Description</h3>
					<p class="description">{wf.description}</p>
				</div>
			{/if}

			<!-- Approval Actions -->
			{#if wf.status === 'submitted' || wf.status === 'in_review'}
				<div class="approval-actions">
					<h3>Approval decision</h3>
					<div class="action-row">
						<form method="POST" action="?/approve" use:enhance={enh()} class="action-form">
							<Textarea name="comment" placeholder="Comment (optional)" rows={2} />
							<Button type="submit" variant="primary" disabled={saving}>
								<CheckCircle size={16} /> Approve
							</Button>
						</form>
						<form method="POST" action="?/reject" use:enhance={enh()} class="action-form">
							<Textarea name="comment" placeholder="Reason for rejection (optional)" rows={2} />
							<Button type="submit" variant="danger" disabled={saving}>
								<XCircle size={16} /> Reject
							</Button>
						</form>
					</div>
				</div>
			{/if}

			{#if wf.status === 'draft'}
				<div class="submit-section">
					<form method="POST" action="?/submit" use:enhance={enh()}>
						<Button type="submit" variant="primary" disabled={saving}>
							Submit for approval
						</Button>
					</form>
				</div>
			{/if}

			<!-- Comments -->
			<div class="section">
				<h3>Comments ({wf.comments.length})</h3>
				<form method="POST" action="?/addComment" use:enhance={enh()} class="comment-form">
					<Textarea name="content" placeholder="Add a comment..." rows={3} />
					<Button type="submit" variant="secondary" size="sm" disabled={saving}>Post comment</Button>
				</form>
				<div class="comment-list">
					{#each wf.comments as comment (comment.id)}
						<div class="comment-item">
							<div class="comment-avatar">{comment.account?.name?.charAt(0).toUpperCase() ?? '?'}</div>
							<div class="comment-body">
								<div class="comment-meta">
									<strong>{comment.account?.name ?? 'Unknown'}</strong>
									<span>{formatDateTime(comment.created_at)}</span>
								</div>
								<p class="comment-content">{comment.content}</p>
							</div>
						</div>
					{/each}
					{#if wf.comments.length === 0}
						<p class="empty">No comments yet.</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Metadata -->
		<div class="sidebar-col">
			<div class="meta-card">
				<dl class="meta-list">
					<div class="meta-row">
						<dt>Priority</dt>
						<dd>{WORKFLOW_PRIORITY_LABELS[wf.priority]}</dd>
					</div>
					{#if wf.category}
						<div class="meta-row">
							<dt>Category</dt>
							<dd>{wf.category.label}</dd>
						</div>
					{/if}
					{#if wf.amount !== null}
						<div class="meta-row">
							<dt>Amount</dt>
							<dd>{wf.amount.toLocaleString()}</dd>
						</div>
					{/if}
					<div class="meta-row">
						<dt>Requester</dt>
						<dd>{wf.requester?.name ?? '—'}</dd>
					</div>
					{#if wf.current_approver}
						<div class="meta-row">
							<dt>Approver</dt>
							<dd>{wf.current_approver.name}</dd>
						</div>
					{/if}
					{#if wf.submitted_at}
						<div class="meta-row">
							<dt>Submitted</dt>
							<dd>{formatDate(wf.submitted_at)}</dd>
						</div>
					{/if}
					{#if wf.completed_at}
						<div class="meta-row">
							<dt>Completed</dt>
							<dd>{formatDate(wf.completed_at)}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.page { display: flex; flex-direction: column; gap: var(--space-xl); }

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		&:hover { color: var(--color-text); }
	}

	.workflow-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);

		h1 { font-size: 1.375rem; }
	}

	.workflow-meta {
		display: flex;
		gap: var(--space-xs);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin-top: 4px;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 4px var(--space-md);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;

		&.badge-success { background-color: var(--color-success-light); color: var(--color-success); }
		&.badge-info { background-color: var(--color-info-light); color: var(--color-info); }
		&.badge-warning { background-color: var(--color-warning-light); color: var(--color-warning); }
		&.badge-danger { background-color: var(--color-danger-light); color: var(--color-danger); }
		&.badge-neutral { background-color: var(--color-bg-sunken); color: var(--color-text-secondary); }
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: var(--space-xl);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.main-col { display: flex; flex-direction: column; gap: var(--space-xl); }
	.section { display: flex; flex-direction: column; gap: var(--space-md); h3 { font-size: 0.9375rem; } }

	.description { font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }

	.approval-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background-color: var(--color-warning-light);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(180, 83, 9, 0.2);
	}

	.action-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);

		@media (max-width: 640px) { grid-template-columns: 1fr; }
	}

	.action-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.submit-section { display: flex; justify-content: flex-start; }

	.comment-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		align-items: flex-end;
		padding: var(--space-md);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.comment-list { display: flex; flex-direction: column; gap: var(--space-md); }

	.comment-item { display: flex; gap: var(--space-md); }
	.comment-avatar {
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
	.comment-body { flex: 1; }
	.comment-meta { display: flex; gap: var(--space-md); font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 4px; strong { color: var(--color-text); } }
	.comment-content { font-size: 0.875rem; white-space: pre-wrap; }

	/* Right sidebar */
	.meta-card {
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		position: sticky;
		top: var(--space-lg);
	}

	.meta-list { display: flex; flex-direction: column; gap: var(--space-md); }
	.meta-row { display: flex; flex-direction: column; gap: 2px; font-size: 0.875rem; }
	.meta-row dt { font-size: 0.75rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }

	.empty { text-align: center; color: var(--color-text-tertiary); padding: var(--space-lg); font-size: 0.875rem; }
</style>
