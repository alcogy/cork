import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ─── Shared ────────────────────────────────────────────────────────────────

export const accounts = sqliteTable('accounts', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	name: text('name').notNull(),
	role: text('role', { enum: ['admin', 'general'] }).notNull().default('general'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
});

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value')
});

export const audit_logs = sqliteTable('audit_logs', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	account_id: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
	action: text('action', {
		enum: ['create', 'update', 'delete', 'login', 'logout', 'export', 'import']
	}).notNull(),
	resource_type: text('resource_type').notNull(),
	resource_id: text('resource_id'),
	metadata: text('metadata'),
	ip_address: text('ip_address'),
	user_agent: text('user_agent'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

// ─── CRM ────────────────────────────────────────────────────────────────────

export const customers = sqliteTable('customers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	zipcode: text('zipcode'),
	address: text('address'),
	email: text('email'),
	tel: text('tel'),
	fax: text('fax'),
	status: text('status', { enum: ['active', 'inactive', 'lead'] }).notNull().default('active'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
});

export const contacts = sqliteTable('contacts', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	customer_id: text('customer_id')
		.notNull()
		.references(() => customers.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	email: text('email'),
	tel: text('tel'),
	department: text('department'),
	position: text('position'),
	note: text('note'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const customer_activities = sqliteTable('customer_activities', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	customer_id: text('customer_id')
		.notNull()
		.references(() => customers.id, { onDelete: 'cascade' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	type: text('type', { enum: ['call', 'email', 'meeting', 'note'] }).notNull(),
	note: text('note'),
	occurred_at: text('occurred_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const customer_schedules = sqliteTable('customer_schedules', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	customer_id: text('customer_id')
		.notNull()
		.references(() => customers.id, { onDelete: 'cascade' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	start_at: text('start_at').notNull(),
	end_at: text('end_at'),
	note: text('note'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const customer_notes = sqliteTable('customer_notes', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	customer_id: text('customer_id')
		.notNull()
		.references(() => customers.id, { onDelete: 'cascade' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	color: text('color', { enum: ['yellow', 'blue', 'green', 'pink', 'orange'] })
		.notNull()
		.default('yellow'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

// ─── Project Management ─────────────────────────────────────────────────────

export const project_statuses = sqliteTable('project_statuses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	label: text('label').notNull(),
	color: text('color').notNull().default('#94a3b8'),
	display_order: integer('display_order').notNull().default(0),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const project_categories = sqliteTable('project_categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	label: text('label').notNull(),
	display_order: integer('display_order').notNull().default(0),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const projects = sqliteTable('projects', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	description: text('description'),
	status_id: integer('status_id').references(() => project_statuses.id, {
		onDelete: 'set null'
	}),
	category_id: integer('category_id').references(() => project_categories.id, {
		onDelete: 'set null'
	}),
	priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
		.notNull()
		.default('medium'),
	start_date: text('start_date'),
	end_date: text('end_date'),
	display_order: integer('display_order').notNull().default(0),
	created_by: text('created_by')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const project_members = sqliteTable('project_members', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	project_id: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['owner', 'member', 'viewer'] }).notNull().default('member'),
	assigned_at: text('assigned_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const project_activities = sqliteTable('project_activities', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	project_id: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	type: text('type').notNull(),
	content: text('content').notNull(),
	metadata: text('metadata'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const project_files = sqliteTable('project_files', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	project_id: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	size: integer('size').notNull(),
	r2_key: text('r2_key').notNull(),
	mime_type: text('mime_type'),
	uploaded_by: text('uploaded_by')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	uploaded_at: text('uploaded_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

// ─── Workflow / Approval ─────────────────────────────────────────────────────

export const workflow_categories = sqliteTable('workflow_categories', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	label: text('label').notNull(),
	color: text('color').notNull().default('#6b7280'),
	note: text('note'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const workflows = sqliteTable('workflows', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	description: text('description'),
	category_id: text('category_id').references(() => workflow_categories.id, {
		onDelete: 'set null'
	}),
	amount: integer('amount'),
	status: text('status', {
		enum: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'cancelled']
	})
		.notNull()
		.default('draft'),
	priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] })
		.notNull()
		.default('normal'),
	requester_id: text('requester_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	current_approver_id: text('current_approver_id').references(() => accounts.id, {
		onDelete: 'set null'
	}),
	submitted_at: text('submitted_at'),
	completed_at: text('completed_at'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
});

export const workflow_approvals = sqliteTable('workflow_approvals', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	workflow_id: text('workflow_id')
		.notNull()
		.references(() => workflows.id, { onDelete: 'cascade' }),
	approver_id: text('approver_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	step_order: integer('step_order').notNull(),
	status: text('status', { enum: ['pending', 'approved', 'rejected'] })
		.notNull()
		.default('pending'),
	comment: text('comment'),
	approved_at: text('approved_at'),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const workflow_comments = sqliteTable('workflow_comments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	workflow_id: text('workflow_id')
		.notNull()
		.references(() => workflows.id, { onDelete: 'cascade' }),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const workflow_files = sqliteTable('workflow_files', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	workflow_id: text('workflow_id')
		.notNull()
		.references(() => workflows.id, { onDelete: 'cascade' }),
	uploader_id: text('uploader_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	size: integer('size').notNull(),
	content_type: text('content_type').notNull(),
	r2_key: text('r2_key').notNull(),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const workflow_templates = sqliteTable('workflow_templates', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	template: text('template').notNull(),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	sort_order: integer('sort_order').notNull().default(0),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
});

// ─── Progress / WBS ──────────────────────────────────────────────────────────

export const wbs = sqliteTable('wbs', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	project_id: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	start_date: text('start_date').notNull(),
	end_date: text('end_date').notNull(),
	created_by: text('created_by').references(() => accounts.id, { onDelete: 'set null' }),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const wbs_members = sqliteTable(
	'wbs_members',
	{
		wbs_id: text('wbs_id')
			.notNull()
			.references(() => wbs.id, { onDelete: 'cascade' }),
		account_id: text('account_id')
			.notNull()
			.references(() => accounts.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.wbs_id, t.account_id] })]
);

export const wbs_tasks = sqliteTable('wbs_tasks', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	wbs_id: text('wbs_id')
		.notNull()
		.references(() => wbs.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
	assignee_id: text('assignee_id').references(() => accounts.id, { onDelete: 'set null' }),
	planned_start: text('planned_start').notNull().default(''),
	planned_end: text('planned_end').notNull().default(''),
	actual_start: text('actual_start').notNull().default(''),
	actual_end: text('actual_end').notNull().default(''),
	progress: integer('progress').notNull().default(0),
	sort_order: integer('sort_order').notNull().default(0)
});

// ─── No-code Apps ────────────────────────────────────────────────────────────

export const apps = sqliteTable('apps', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	fields: text('fields').notNull().default('[]'),
	is_published: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const app_records = sqliteTable('app_records', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	app_id: text('app_id')
		.notNull()
		.references(() => apps.id, { onDelete: 'cascade' }),
	data: text('data').notNull().default('{}'),
	created_by: text('created_by').references(() => accounts.id, { onDelete: 'set null' }),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updated_at: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const app_bookmarks = sqliteTable('app_bookmarks', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	account_id: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	app_id: text('app_id')
		.notNull()
		.references(() => apps.id, { onDelete: 'cascade' }),
	app_name: text('app_name').notNull(),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const customerRelations = relations(customers, ({ many }) => ({
	contacts: many(contacts),
	activities: many(customer_activities),
	schedules: many(customer_schedules),
	notes: many(customer_notes)
}));

export const contactRelations = relations(contacts, ({ one }) => ({
	customer: one(customers, { fields: [contacts.customer_id], references: [customers.id] })
}));

export const customerActivityRelations = relations(customer_activities, ({ one }) => ({
	customer: one(customers, {
		fields: [customer_activities.customer_id],
		references: [customers.id]
	}),
	account: one(accounts, {
		fields: [customer_activities.account_id],
		references: [accounts.id]
	})
}));

export const customerScheduleRelations = relations(customer_schedules, ({ one }) => ({
	customer: one(customers, {
		fields: [customer_schedules.customer_id],
		references: [customers.id]
	}),
	account: one(accounts, {
		fields: [customer_schedules.account_id],
		references: [accounts.id]
	})
}));

export const customerNoteRelations = relations(customer_notes, ({ one }) => ({
	customer: one(customers, {
		fields: [customer_notes.customer_id],
		references: [customers.id]
	}),
	account: one(accounts, {
		fields: [customer_notes.account_id],
		references: [accounts.id]
	})
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
	status: one(project_statuses, { fields: [projects.status_id], references: [project_statuses.id] }),
	category: one(project_categories, {
		fields: [projects.category_id],
		references: [project_categories.id]
	}),
	creator: one(accounts, { fields: [projects.created_by], references: [accounts.id] }),
	members: many(project_members),
	activities: many(project_activities),
	files: many(project_files),
	wbs: many(wbs)
}));

export const projectMemberRelations = relations(project_members, ({ one }) => ({
	project: one(projects, { fields: [project_members.project_id], references: [projects.id] }),
	account: one(accounts, { fields: [project_members.account_id], references: [accounts.id] })
}));

export const projectActivityRelations = relations(project_activities, ({ one }) => ({
	project: one(projects, { fields: [project_activities.project_id], references: [projects.id] }),
	account: one(accounts, { fields: [project_activities.account_id], references: [accounts.id] })
}));

export const workflowRelations = relations(workflows, ({ one, many }) => ({
	category: one(workflow_categories, {
		fields: [workflows.category_id],
		references: [workflow_categories.id]
	}),
	requester: one(accounts, { fields: [workflows.requester_id], references: [accounts.id] }),
	current_approver: one(accounts, {
		fields: [workflows.current_approver_id],
		references: [accounts.id]
	}),
	approvals: many(workflow_approvals),
	comments: many(workflow_comments),
	files: many(workflow_files)
}));

export const workflowApprovalRelations = relations(workflow_approvals, ({ one }) => ({
	workflow: one(workflows, {
		fields: [workflow_approvals.workflow_id],
		references: [workflows.id]
	}),
	approver: one(accounts, {
		fields: [workflow_approvals.approver_id],
		references: [accounts.id]
	})
}));

export const workflowCommentRelations = relations(workflow_comments, ({ one }) => ({
	workflow: one(workflows, {
		fields: [workflow_comments.workflow_id],
		references: [workflows.id]
	}),
	account: one(accounts, { fields: [workflow_comments.account_id], references: [accounts.id] })
}));

export const wbsRelations = relations(wbs, ({ one, many }) => ({
	project: one(projects, { fields: [wbs.project_id], references: [projects.id] }),
	creator: one(accounts, { fields: [wbs.created_by], references: [accounts.id] }),
	members: many(wbs_members),
	tasks: many(wbs_tasks)
}));

export const wbsMemberRelations = relations(wbs_members, ({ one }) => ({
	wbs: one(wbs, { fields: [wbs_members.wbs_id], references: [wbs.id] }),
	account: one(accounts, { fields: [wbs_members.account_id], references: [accounts.id] })
}));

export const wbsTaskRelations = relations(wbs_tasks, ({ one }) => ({
	wbs: one(wbs, { fields: [wbs_tasks.wbs_id], references: [wbs.id] }),
	assignee: one(accounts, { fields: [wbs_tasks.assignee_id], references: [accounts.id] })
}));

export const appRelations = relations(apps, ({ many }) => ({
	records: many(app_records),
	bookmarks: many(app_bookmarks)
}));

export const appRecordRelations = relations(app_records, ({ one }) => ({
	app: one(apps, { fields: [app_records.app_id], references: [apps.id] }),
	creator: one(accounts, { fields: [app_records.created_by], references: [accounts.id] })
}));

export const auditLogRelations = relations(audit_logs, ({ one }) => ({
	account: one(accounts, { fields: [audit_logs.account_id], references: [accounts.id] })
}));
