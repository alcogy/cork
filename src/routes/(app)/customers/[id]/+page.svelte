<script lang="ts">
	import { Button, Card, Modal, Input, Label, Textarea, ConfirmDialog } from '$lib/ui';
	import {
		ACTIVITY_TYPE_LABELS,
		ACTIVITY_TYPES,
		CUSTOMER_STATUS_LABELS,
		CUSTOMER_STATUSES,
		NOTE_COLORS
	} from '$lib/domain/customer/types';
	import { ArrowLeft, Plus, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDateTime, formatDate } from '$lib/utils';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'activities' | 'schedules' | 'notes' | 'contacts';
	let activeTab = $state<Tab>('activities');

	let showEditCustomer = $state(false);
	let showAddActivity = $state(false);
	let showAddSchedule = $state(false);
	let showAddNote = $state(false);
	let showAddContact = $state(false);
	let confirmDeleteId = $state<string | null>(null);
	let confirmDeleteType = $state<string>('');
	let saving = $state(false);

	function withInvalidate(action: string) {
		return () => {
			saving = true;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				await invalidateAll();
				showEditCustomer = false;
				showAddActivity = false;
				showAddSchedule = false;
				showAddNote = false;
				showAddContact = false;
				saving = false;
			};
		};
	}

	const noteColorStyle: Record<string, string> = {
		yellow: '#fef9c3',
		blue: '#dbeafe',
		green: '#dcfce7',
		pink: '#fce7f3',
		orange: '#ffedd5'
	};
</script>

<svelte:head>
	<title>{data.customer.name} — Cork</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/customers" class="back-link"><ArrowLeft size={16} /> {t().customer.title}</a>
	</div>

	<div class="customer-header">
		<div class="customer-info">
			<h1>{data.customer.name}</h1>
			<span class="status-badge status-{data.customer.status}">
				{CUSTOMER_STATUS_LABELS[data.customer.status]}
			</span>
		</div>
		<Button variant="secondary" size="sm" onclick={() => (showEditCustomer = true)}>{t().common.edit}</Button>
	</div>

	<div class="meta-grid">
		{#if data.customer.email}
			<div class="meta-item"><span class="meta-label">{t().customer.email}</span><span>{data.customer.email}</span></div>
		{/if}
		{#if data.customer.tel}
			<div class="meta-item"><span class="meta-label">{t().customer.tel}</span><span>{data.customer.tel}</span></div>
		{/if}
		{#if data.customer.fax}
			<div class="meta-item"><span class="meta-label">{t().customer.fax}</span><span>{data.customer.fax}</span></div>
		{/if}
		{#if data.customer.address}
			<div class="meta-item"><span class="meta-label">{t().customer.address}</span><span>{data.customer.address}</span></div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="tabs">
		{#each (['activities', 'schedules', 'notes', 'contacts'] as Tab[]) as tab (tab)}
			<button
				class="tab {activeTab === tab ? 'active' : ''}"
				onclick={() => (activeTab = tab)}
			>
				{tab.charAt(0).toUpperCase() + tab.slice(1)}
				{#if tab === 'activities'}({data.customer.activities.length}){/if}
				{#if tab === 'schedules'}({data.customer.schedules.length}){/if}
				{#if tab === 'notes'}({data.customer.notes.length}){/if}
				{#if tab === 'contacts'}({data.customer.contacts.length}){/if}
			</button>
		{/each}
	</div>

	<!-- Activities Tab -->
	{#if activeTab === 'activities'}
		<div class="tab-content">
			<div class="tab-header">
				<h2>{t().customer.activities}</h2>
				<Button variant="primary" size="sm" onclick={() => (showAddActivity = true)}>
					<Plus size={14} /> {t().customer.addActivity}
				</Button>
			</div>
			{#if data.customer.activities.length > 0}
				<div class="activity-list">
					{#each data.customer.activities as activity (activity.id)}
						<div class="activity-item">
							<div class="activity-type type-{activity.type}">
								{ACTIVITY_TYPE_LABELS[activity.type as keyof typeof ACTIVITY_TYPE_LABELS]}
							</div>
							<div class="activity-body">
								<div class="activity-meta">
									<span class="activity-by">{activity.account?.name ?? 'Unknown'}</span>
									<span class="activity-time">{formatDateTime(activity.occurred_at)}</span>
								</div>
								{#if activity.note}
									<p class="activity-note">{activity.note}</p>
								{/if}
							</div>
							<form method="POST" action="?/deleteActivity" use:enhance={withInvalidate('deleteActivity')}>
								<input type="hidden" name="id" value={activity.id} />
								<button type="submit" class="delete-btn" aria-label="Delete activity">
									<Trash2 size={14} />
								</button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty">{t().common.noResults}</p>
			{/if}
		</div>
	{/if}

	<!-- Schedules Tab -->
	{#if activeTab === 'schedules'}
		<div class="tab-content">
			<div class="tab-header">
				<h2>{t().customer.schedules}</h2>
				<Button variant="primary" size="sm" onclick={() => (showAddSchedule = true)}>
					<Plus size={14} /> {t().customer.addSchedule}
				</Button>
			</div>
			{#if data.customer.schedules.length > 0}
				<div class="schedule-list">
					{#each data.customer.schedules as schedule (schedule.id)}
						<div class="schedule-item">
							<div class="schedule-date">{formatDate(schedule.start_at)}</div>
							<div class="schedule-body">
								<div class="schedule-title">{schedule.title}</div>
								{#if schedule.note}<p class="schedule-note">{schedule.note}</p>{/if}
								<span class="schedule-by">{schedule.account?.name ?? ''}</span>
							</div>
							<form method="POST" action="?/deleteSchedule" use:enhance={withInvalidate('deleteSchedule')}>
								<input type="hidden" name="id" value={schedule.id} />
								<button type="submit" class="delete-btn" aria-label="Delete schedule">
									<Trash2 size={14} />
								</button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty">{t().common.noResults}</p>
			{/if}
		</div>
	{/if}

	<!-- Notes Tab -->
	{#if activeTab === 'notes'}
		<div class="tab-content">
			<div class="tab-header">
				<h2>{t().customer.notes}</h2>
				<Button variant="primary" size="sm" onclick={() => (showAddNote = true)}>
					<Plus size={14} /> {t().customer.addNote}
				</Button>
			</div>
			{#if data.customer.notes.length > 0}
				<div class="notes-grid">
					{#each data.customer.notes as note (note.id)}
						<div class="note-card" style="background-color: {noteColorStyle[note.color] ?? '#fef9c3'}">
							<p class="note-content">{note.content}</p>
							<div class="note-footer">
								<span>{note.account?.name ?? ''}</span>
								<form method="POST" action="?/deleteNote" use:enhance={withInvalidate('deleteNote')}>
									<input type="hidden" name="id" value={note.id} />
									<button type="submit" class="delete-btn" aria-label="Delete note">
										<Trash2 size={12} />
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty">{t().common.noResults}</p>
			{/if}
		</div>
	{/if}

	<!-- Contacts Tab -->
	{#if activeTab === 'contacts'}
		<div class="tab-content">
			<div class="tab-header">
				<h2>{t().customer.contacts}</h2>
				<Button variant="primary" size="sm" onclick={() => (showAddContact = true)}>
					<Plus size={14} /> {t().customer.addContact}
				</Button>
			</div>
			{#if data.customer.contacts.length > 0}
				<div class="contacts-list">
					{#each data.customer.contacts as contact (contact.id)}
						<div class="contact-item">
							<div class="contact-main">
								<div class="contact-name">{contact.name}</div>
								{#if contact.position || contact.department}
									<div class="contact-role">
										{[contact.position, contact.department].filter(Boolean).join(' · ')}
									</div>
								{/if}
								<div class="contact-details">
									{#if contact.email}<span>{contact.email}</span>{/if}
									{#if contact.tel}<span>{contact.tel}</span>{/if}
								</div>
							</div>
							<form method="POST" action="?/deleteContact" use:enhance={withInvalidate('deleteContact')}>
								<input type="hidden" name="id" value={contact.id} />
								<button type="submit" class="delete-btn" aria-label="Delete contact">
									<Trash2 size={14} />
								</button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty">{t().common.noResults}</p>
			{/if}
		</div>
	{/if}
</div>

<!-- Edit Customer Modal -->
<Modal open={showEditCustomer} title={t().customer.edit} onclose={() => (showEditCustomer = false)}>
	<form method="POST" action="?/updateCustomer" use:enhance={withInvalidate('updateCustomer')}>
		<div class="form-grid">
			<div class="field full">
				<Label for="edit-name" required>{t().customer.name}</Label>
				<Input id="edit-name" name="name" value={data.customer.name} required />
			</div>
			<div class="field">
				<Label for="edit-email">{t().customer.email}</Label>
				<Input id="edit-email" name="email" type="email" value={data.customer.email ?? ''} />
			</div>
			<div class="field">
				<Label for="edit-tel">{t().customer.tel}</Label>
				<Input id="edit-tel" name="tel" value={data.customer.tel ?? ''} />
			</div>
			<div class="field">
				<Label for="edit-fax">{t().customer.fax}</Label>
				<Input id="edit-fax" name="fax" value={data.customer.fax ?? ''} />
			</div>
			<div class="field">
				<Label for="edit-zipcode">{t().customer.zipcode}</Label>
				<Input id="edit-zipcode" name="zipcode" value={data.customer.zipcode ?? ''} />
			</div>
			<div class="field full">
				<Label for="edit-address">{t().customer.address}</Label>
				<Input id="edit-address" name="address" value={data.customer.address ?? ''} />
			</div>
			<div class="field">
				<Label for="edit-status">{t().customer.status}</Label>
				<select id="edit-status" name="status" class="select-input">
					{#each CUSTOMER_STATUSES as s (s)}
						<option value={s} selected={data.customer.status === s}>{CUSTOMER_STATUS_LABELS[s]}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showEditCustomer = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().common.save}</Button>
		</div>
	</form>
</Modal>

<!-- Add Activity Modal -->
<Modal open={showAddActivity} title={t().customer.addActivity} onclose={() => (showAddActivity = false)}>
	<form method="POST" action="?/createActivity" use:enhance={withInvalidate('createActivity')}>
		<div class="form-fields">
			<div class="field">
				<Label for="act-type" required>{t().customer.activities}</Label>
				<select id="act-type" name="type" class="select-input" required>
					{#each ACTIVITY_TYPES as aType (aType)}
						<option value={aType}>{ACTIVITY_TYPE_LABELS[aType]}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<Label for="act-note">{t().customer.notes}</Label>
				<Textarea id="act-note" name="note" rows={3} />
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showAddActivity = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().common.add}</Button>
		</div>
	</form>
</Modal>

<!-- Add Schedule Modal -->
<Modal open={showAddSchedule} title={t().customer.addSchedule} onclose={() => (showAddSchedule = false)}>
	<form method="POST" action="?/createSchedule" use:enhance={withInvalidate('createSchedule')}>
		<div class="form-fields">
			<div class="field">
				<Label for="sch-title" required>{t().common.details}</Label>
				<Input id="sch-title" name="title" required />
			</div>
			<div class="field">
				<Label for="sch-start" required>{t().project.startDate}</Label>
				<Input id="sch-start" name="start_at" type="datetime-local" required />
			</div>
			<div class="field">
				<Label for="sch-end">{t().project.endDate}</Label>
				<Input id="sch-end" name="end_at" type="datetime-local" />
			</div>
			<div class="field">
				<Label for="sch-note">{t().customer.notes}</Label>
				<Textarea id="sch-note" name="note" rows={2} />
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showAddSchedule = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().common.add}</Button>
		</div>
	</form>
</Modal>

<!-- Add Note Modal -->
<Modal open={showAddNote} title={t().customer.addNote} onclose={() => (showAddNote = false)}>
	<form method="POST" action="?/createNote" use:enhance={withInvalidate('createNote')}>
		<div class="form-fields">
			<div class="field">
				<Label for="note-content" required>{t().common.details}</Label>
				<Textarea id="note-content" name="content" rows={4} required />
			</div>
			<div class="field">
				<Label>{t().common.filter}</Label>
				<div class="color-picker">
					{#each NOTE_COLORS as color (color)}
						<label class="color-option">
							<input type="radio" name="color" value={color} checked={color === 'yellow'} />
							<span class="color-swatch" style="background-color: {noteColorStyle[color]}"></span>
						</label>
					{/each}
				</div>
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showAddNote = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().common.add}</Button>
		</div>
	</form>
</Modal>

<!-- Add Contact Modal -->
<Modal open={showAddContact} title={t().customer.addContact} onclose={() => (showAddContact = false)}>
	<form method="POST" action="?/createContact" use:enhance={withInvalidate('createContact')}>
		<div class="form-grid">
			<div class="field full">
				<Label for="con-name" required>{t().account.name}</Label>
				<Input id="con-name" name="name" required />
			</div>
			<div class="field">
				<Label for="con-dept">{t().common.details}</Label>
				<Input id="con-dept" name="department" />
			</div>
			<div class="field">
				<Label for="con-pos">{t().common.details}</Label>
				<Input id="con-pos" name="position" />
			</div>
			<div class="field">
				<Label for="con-email">{t().customer.email}</Label>
				<Input id="con-email" name="email" type="email" />
			</div>
			<div class="field">
				<Label for="con-tel">{t().customer.tel}</Label>
				<Input id="con-tel" name="tel" />
			</div>
			<div class="field full">
				<Label for="con-note">{t().customer.notes}</Label>
				<Textarea id="con-note" name="note" rows={2} />
			</div>
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showAddContact = false)}>{t().common.cancel}</Button>
			<Button type="submit" variant="primary" disabled={saving}>{t().common.add}</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.breadcrumb {
		.back-link {
			display: inline-flex;
			align-items: center;
			gap: var(--space-xs);
			color: var(--color-text-secondary);
			font-size: 0.875rem;
			text-decoration: none;

			&:hover {
				color: var(--color-text);
			}
		}
	}

	.customer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);

		h1 {
			font-size: 1.5rem;
		}
	}

	.customer-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;

		&.status-active {
			background-color: var(--color-success-light);
			color: var(--color-success);
		}
		&.status-inactive {
			background-color: var(--color-bg-sunken);
			color: var(--color-text-secondary);
		}
		&.status-lead {
			background-color: var(--color-warning-light);
			color: var(--color-warning);
		}
	}

	.meta-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-lg) var(--space-2xl);
		padding: var(--space-lg);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.meta-label {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
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
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
		margin-bottom: -1px;

		&:hover {
			color: var(--color-text);
		}

		&.active {
			color: var(--color-primary);
			border-bottom-color: var(--color-primary);
		}
	}

	.tab-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.tab-header {
		display: flex;
		align-items: center;
		justify-content: space-between;

		h2 {
			font-size: 1rem;
		}
	}

	.activity-list,
	.schedule-list,
	.contacts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.activity-item,
	.schedule-item,
	.contact-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
	}

	.activity-type {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;

		&.type-call { background-color: #e0f2fe; color: #0369a1; }
		&.type-email { background-color: #dcfce7; color: #15803d; }
		&.type-meeting { background-color: #ede9fe; color: #7c3aed; }
		&.type-note { background-color: #fef9c3; color: #a16207; }
	}

	.activity-body,
	.schedule-body,
	.contact-main {
		flex: 1;
		min-width: 0;
	}

	.activity-meta,
	.contact-details {
		display: flex;
		gap: var(--space-md);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.activity-note,
	.schedule-note {
		margin-top: var(--space-xs);
		font-size: 0.875rem;
		white-space: pre-wrap;
	}

	.schedule-date {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-primary);
		white-space: nowrap;
		flex-shrink: 0;
		min-width: 100px;
	}

	.schedule-title,
	.contact-name {
		font-weight: 500;
	}

	.schedule-by,
	.contact-role {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.notes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-md);
	}

	.note-card {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.note-content {
		font-size: 0.875rem;
		white-space: pre-wrap;
		word-break: break-word;
		margin-bottom: var(--space-sm);
	}

	.note-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
		color: rgba(0, 0, 0, 0.5);
	}

	.delete-btn {
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
		flex-shrink: 0;

		&:hover {
			background-color: var(--color-danger-light);
			color: var(--color-danger);
		}
	}

	.empty {
		text-align: center;
		color: var(--color-text-tertiary);
		padding: var(--space-2xl);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&.full {
			grid-column: 1 / -1;
		}
	}

	.select-input {
		height: 36px;
		padding: 0 var(--space-md);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		font-size: 0.875rem;
	}

	.color-picker {
		display: flex;
		gap: var(--space-sm);
	}

	.color-option {
		input {
			position: absolute;
			opacity: 0;
			width: 0;
			height: 0;
		}

		input:checked + .color-swatch {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}

	.color-swatch {
		display: block;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
