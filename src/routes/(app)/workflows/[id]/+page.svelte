<script lang="ts">
	import { Avatar, Button, Input, Textarea, FileUploadDialog, ConfirmDialog } from '$lib/ui';
	import { ArrowLeft, CheckCircle, XCircle, UserPlus, Trash2, Clock, Check, X, Paperclip } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDateJP, formatDateTimeJP } from '$lib/utils';
	import { WORKFLOW_PRIORITIES } from '$lib/types/workflow';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let showUploadDialog = $state(false);
	let editTitle = $state(data.workflow.title);
	let editPriority = $state(data.workflow.priority);
	let editDescription = $state(data.workflow.description ?? '');

	$effect(() => {
		editTitle = data.workflow.title;
		editPriority = data.workflow.priority;
		editDescription = data.workflow.description ?? '';
	});
	let decisionComment = $state('');
	let pendingAction = $state<'approve' | 'reject' | null>(null);
	let approveFormEl = $state<HTMLFormElement | null>(null);
	let rejectFormEl = $state<HTMLFormElement | null>(null);

	function confirmApprove() {
		pendingAction = 'approve';
	}

	function confirmReject() {
		pendingAction = 'reject';
	}

	function executeDecision() {
		if (pendingAction === 'approve') approveFormEl?.requestSubmit();
		else if (pendingAction === 'reject') rejectFormEl?.requestSubmit();
		pendingAction = null;
	}

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

	const approvalStatusIcon: Record<string, typeof Check> = {
		pending: Clock,
		approved: Check,
		rejected: X
	};

	const approvalStatusColor: Record<string, string> = {
		pending: 'var(--color-text-tertiary)',
		approved: 'var(--color-success)',
		rejected: 'var(--color-danger)'
	};

	const wf = $derived(data.workflow);

	// Accounts not already added as approvers
	const approverIds = $derived(new Set(wf.approvals.map((a) => a.approver_id)));
	const availableApprovers = $derived(data.allAccounts.filter((a) => !approverIds.has(a.id)));
</script>

<svelte:head>
	<title>{data.workflow.title} — Cork</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/workflows" class="back-link"><ArrowLeft size={16} /> {t().workflow.title}</a>
	</div>

	<div class="workflow-header">
		<div>
			<h1>{wf.title}</h1>
			<div class="workflow-meta">
				<span>by {wf.requester?.name ?? '—'}</span>
				<span>·</span>
				<span>{formatDateJP(wf.created_at)}</span>
			</div>
		</div>
		<span class="status-badge badge-{statusColor[wf.status] ?? 'neutral'}">
			{t().workflow.statuses[wf.status]}
		</span>
	</div>

	<div class="content-grid">
		<!-- Left: Details + Approvers + Actions + Comments -->
		<div class="main-col">
			{#if wf.status === 'draft' && (data.isRequester || data.isAdmin)}
				<div class="section draft-edit-section">
					<form method="POST" action="?/update" use:enhance={enh()} class="draft-edit-form">
						<div class="draft-field">
							<label class="draft-label" for="wf-title">{t().workflow.requestTitle} *</label>
							<Input id="wf-title" name="title" bind:value={editTitle} required />
						</div>
						<div class="draft-field">
							<label class="draft-label" for="wf-priority">{t().workflow.priority}</label>
							<select id="wf-priority" name="priority" class="draft-select" bind:value={editPriority}>
								{#each WORKFLOW_PRIORITIES as p (p)}
									<option value={p}>{t().workflow.priorities[p]}</option>
								{/each}
							</select>
						</div>
						<div class="draft-field">
							<label class="draft-label" for="wf-desc">{t().workflow.description}</label>
							<Textarea id="wf-desc" name="description" rows={4} bind:value={editDescription} />
						</div>
						<div class="draft-save-row">
							<Button type="submit" variant="secondary" size="sm" disabled={saving}>{t().common.save}</Button>
						</div>
					</form>
				</div>
			{:else if wf.description}
				<div class="section">
					<h3>{t().workflow.description}</h3>
					<p class="description">{wf.description}</p>
				</div>
			{/if}

			<!-- Approver Setup (draft only) -->
			{#if wf.status === 'draft' && (data.isRequester || data.isAdmin)}
				<div class="section approver-setup">
					<h3>{t().workflow.approvalSteps}</h3>
					<p class="section-hint">{t().workflow.approvalHint}</p>

					<div class="approver-list">
						{#each wf.approvals as approval (approval.id)}
							<div class="approver-row">
								<span class="step-num">{approval.step_order}</span>
								<Avatar name={approval.approver.name} accountId={approval.approver.id} avatarKey={approval.approver.avatar_key} size={28} />
								<span class="approver-name">{approval.approver.name}</span>
								<form method="POST" action="?/removeApprover" use:enhance={enh()}>
									<input type="hidden" name="id" value={approval.id} />
									<button type="submit" class="del-btn" aria-label="Remove approver" disabled={saving}>
										<Trash2 size={13} />
									</button>
								</form>
							</div>
						{/each}
						{#if wf.approvals.length === 0}
							<p class="empty-approvers">{t().workflow.noApprovers}</p>
						{/if}
					</div>

					{#if availableApprovers.length > 0}
						<form method="POST" action="?/addApprover" use:enhance={enh()} class="add-approver-row">
							<select name="approver_id" class="select-input" required aria-label="Select approver">
								<option value="">{t().workflow.selectApprover}</option>
								{#each availableApprovers as account (account.id)}
									<option value={account.id}>{account.name}</option>
								{/each}
							</select>
							<Button type="submit" variant="primary" size="sm" disabled={saving}>
								<UserPlus size={14} /> {t().workflow.addApprover}
							</Button>
						</form>
					{/if}
				</div>
			{:else if wf.approvals.length > 0}
				<!-- Approval steps status (non-draft) -->
				<div class="section">
					<h3>{t().workflow.approvalSteps}</h3>
					<div class="approval-steps">
						{#each wf.approvals as step (step.id)}
							<div class="step-row">
								<div class="step-icon" style="color: {approvalStatusColor[step.status]}">
									<svelte:component this={approvalStatusIcon[step.status]} size={16} />
								</div>
								<div class="step-info">
									<div class="step-name">{step.approver.name}</div>
									{#if step.comment}
										<div class="step-comment">{step.comment}</div>
									{/if}
								</div>
								<span class="step-status status-{step.status}">
									{t().workflow.approvalStatuses[step.status]}
								</span>
								{#if step.approved_at}
									<span class="step-date">{formatDateJP(step.approved_at)}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Submit action (draft with approvers) -->
			{#if wf.status === 'draft' && data.isRequester && wf.approvals.length > 0}
				<div class="submit-section">
					<form method="POST" action="?/submit" use:enhance={enh()}>
						<input type="hidden" name="title" value={editTitle} />
						<input type="hidden" name="priority" value={editPriority} />
						<input type="hidden" name="description" value={editDescription} />
						<Button type="submit" variant="primary" disabled={saving}>
							{t().workflow.submit}
						</Button>
					</form>
				</div>
			{/if}

			<!-- Approval Actions (for approvers) -->
			{#if data.canApprove}
				<div class="approval-actions">
					<h3>{t().workflow.yourDecision}</h3>
					<Textarea
						bind:value={decisionComment}
						placeholder={t().workflow.decisionComment}
						rows={3}
					/>
					<div class="decision-buttons">
						<Button variant="primary" onclick={confirmApprove} disabled={saving}>
							<CheckCircle size={16} /> {t().workflow.approve}
						</Button>
						<Button variant="danger" onclick={confirmReject} disabled={saving}>
							<XCircle size={16} /> {t().workflow.reject}
						</Button>
					</div>

					<!-- Hidden forms for actual submission -->
					<form bind:this={approveFormEl} method="POST" action="?/approve" use:enhance={enh()} class="hidden-form">
						<input type="hidden" name="comment" value={decisionComment} />
					</form>
					<form bind:this={rejectFormEl} method="POST" action="?/reject" use:enhance={enh()} class="hidden-form">
						<input type="hidden" name="comment" value={decisionComment} />
					</form>
				</div>
			{/if}

			<!-- Files -->
			<div class="section">
				<h3><Paperclip size={14} /> Files ({data.files.length})</h3>
				{#if data.isRequester || data.isAdmin}
					<div class="files-header">
						<Button variant="secondary" size="sm" onclick={() => (showUploadDialog = true)}>
							<Paperclip size={13} /> Upload
						</Button>
					</div>
				{/if}
				{#if data.files.length > 0}
					<ul class="file-list">
						{#each data.files as file (file.id)}
							<li class="file-item">
								<Paperclip size={13} />
								<span class="file-name">{file.filename}</span>
								<span class="file-size">{(file.size / 1024).toFixed(0)} KB</span>
								{#if data.isRequester || data.isAdmin}
									<form method="POST" action="?/deleteFile" use:enhance={enh()}>
										<input type="hidden" name="id" value={file.id} />
										<button type="submit" class="del-btn" aria-label="Delete file" disabled={saving}>
											<Trash2 size={13} />
										</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">{t().workflow.noFiles}</p>
				{/if}
			</div>

			<!-- Comments -->
			<div class="section">
				<h3>{t().workflow.comments} ({wf.comments.length})</h3>
				<form method="POST" action="?/addComment" use:enhance={enh()} class="comment-form">
					<Textarea name="content" placeholder={t().project.commentPlaceholder} rows={3} />
					<Button type="submit" variant="secondary" size="sm" disabled={saving}>{t().workflow.postComment}</Button>
				</form>
				<div class="comment-list">
					{#each wf.comments as comment (comment.id)}
						<div class="comment-item">
							<Avatar name={comment.account?.name ?? '?'} accountId={comment.account?.id} avatarKey={comment.account?.avatar_key} size={32} />
							<div class="comment-body">
								<div class="comment-meta">
									<strong>{comment.account?.name ?? t().common.unknown}</strong>
									<span>{formatDateTimeJP(comment.created_at)}</span>
								</div>
								<p class="comment-content">{comment.content}</p>
							</div>
						</div>
					{/each}
					{#if wf.comments.length === 0}
						<p class="empty">{t().workflow.noComments}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Metadata -->
		<div class="sidebar-col">
			<div class="meta-card">
				<dl class="meta-list">
					<div class="meta-row">
						<dt>{t().workflow.priority}</dt>
						<dd>{t().workflow.priorities[wf.priority]}</dd>
					</div>
					{#if wf.category}
						<div class="meta-row">
							<dt>{t().workflow.category}</dt>
							<dd>{wf.category.label}</dd>
						</div>
					{/if}
					{#if wf.amount !== null}
						<div class="meta-row">
							<dt>{t().workflow.amount}</dt>
							<dd>{wf.amount.toLocaleString()}</dd>
						</div>
					{/if}
					<div class="meta-row">
						<dt>{t().workflow.requester}</dt>
						<dd>{wf.requester?.name ?? '—'}</dd>
					</div>
					{#if wf.submitted_at}
						<div class="meta-row">
							<dt>{t().common.createdAt}</dt>
							<dd>{formatDateJP(wf.submitted_at)}</dd>
						</div>
					{/if}
					{#if wf.completed_at}
						<div class="meta-row">
							<dt>{t().common.updatedAt}</dt>
							<dd>{formatDateJP(wf.completed_at)}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</div>
	</div>
</div>

<ConfirmDialog
	open={pendingAction === 'approve'}
	title={t().workflow.approveConfirm}
	message={t().workflow.approveConfirmMessage}
	confirmLabel={t().workflow.approve}
	onconfirm={executeDecision}
	oncancel={() => (pendingAction = null)}
/>

<ConfirmDialog
	open={pendingAction === 'reject'}
	title={t().workflow.rejectConfirm}
	message={t().workflow.rejectConfirmMessage}
	confirmLabel={t().workflow.reject}
	oncancel={() => (pendingAction = null)}
	onconfirm={executeDecision}
/>

<FileUploadDialog
	bind:open={showUploadDialog}
	action="?/uploadFile"
	maxSizeMb={10}
	onuploaded={() => invalidateAll()}
/>

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
		grid-template-columns: 1fr 260px;
		gap: var(--space-xl);

		@media (max-width: 768px) { grid-template-columns: 1fr; }
	}

	.main-col { display: flex; flex-direction: column; gap: var(--space-xl); }
	.section { display: flex; flex-direction: column; gap: var(--space-md); h3 { font-size: 0.9375rem; } }
	.section-hint { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: -var(--space-sm); }
	.files-header { display: flex; }
	.description { font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }

	.draft-edit-section {
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.draft-edit-form { display: flex; flex-direction: column; gap: var(--space-lg); }
	.draft-field { display: flex; flex-direction: column; gap: var(--space-xs); }
	.draft-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); }
	.draft-select {
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.875rem;
		width: 100%;
	}
	.draft-save-row { display: flex; justify-content: flex-end; }

	/* Approver setup */
	.approver-setup {
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.approver-list { display: flex; flex-direction: column; gap: var(--space-sm); margin: var(--space-sm) 0; }

	.approver-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg-sunken);
		border-radius: var(--radius-md);
	}

	.step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background-color: var(--color-primary-light);
		color: var(--color-primary);
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
	}


	.approver-name { flex: 1; font-size: 0.875rem; }

	.empty-approvers {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		padding: var(--space-md);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.add-approver-row {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		margin-top: var(--space-sm);
	}

	.select-input {
		flex: 1;
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.875rem;
	}

	/* Approval steps (non-draft) */
	.approval-steps { display: flex; flex-direction: column; gap: var(--space-sm); }

	.step-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
	}

	.step-icon { flex-shrink: 0; }
	.step-info { flex: 1; }
	.step-name { font-size: 0.875rem; font-weight: 500; }
	.step-comment { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px; }

	.step-status {
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;

		&.status-pending { background: var(--color-bg-sunken); color: var(--color-text-tertiary); }
		&.status-approved { background: var(--color-success-light); color: var(--color-success); }
		&.status-rejected { background: var(--color-danger-light); color: var(--color-danger); }
	}

	.step-date { font-size: 0.75rem; color: var(--color-text-tertiary); white-space: nowrap; }

	/* Submit */
	.submit-section { display: flex; justify-content: flex-start; }

	/* Approval actions */
	.approval-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background-color: var(--color-warning-light);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(180, 83, 9, 0.2);
	}

	.decision-buttons {
		display: flex;
		gap: var(--space-md);
	}

	.hidden-form { display: none; }

	/* Comments */
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
	.comment-body { flex: 1; }
	.comment-meta { display: flex; gap: var(--space-md); font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 4px; strong { color: var(--color-text); } }
	.comment-content { font-size: 0.875rem; white-space: pre-wrap; }

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
	}

	/* Sidebar */
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

	.file-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
	}

	.file-name { flex: 1; font-weight: 500; }
	.file-size { color: var(--color-text-muted); font-size: 0.75rem; }
</style>
