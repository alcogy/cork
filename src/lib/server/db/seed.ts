import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { hashPassword } from '../auth/index';

async function seed() {
	const proxy = await getPlatformProxy<{ DB: D1Database }>();
	const db = drizzle(proxy.env.DB, { schema });

	console.log('Clearing existing data...');
	await db.delete(schema.app_bookmarks);
	await db.delete(schema.app_records);
	await db.delete(schema.apps);
	await db.delete(schema.wbs_tasks);
	await db.delete(schema.wbs_members);
	await db.delete(schema.wbs);
	await db.delete(schema.workflow_files);
	await db.delete(schema.workflow_comments);
	await db.delete(schema.workflow_approvals);
	await db.delete(schema.workflows);
	await db.delete(schema.workflow_categories);
	await db.delete(schema.project_files);
	await db.delete(schema.project_activities);
	await db.delete(schema.project_members);
	await db.delete(schema.projects);
	await db.delete(schema.project_categories);
	await db.delete(schema.project_statuses);
	await db.delete(schema.customer_notes);
	await db.delete(schema.customer_schedules);
	await db.delete(schema.customer_activities);
	await db.delete(schema.contacts);
	await db.delete(schema.customers);
	await db.delete(schema.audit_logs);
	await db.delete(schema.settings);
	await db.delete(schema.accounts);

	console.log('Seeding accounts...');
	const adminHash = await hashPassword('admin123');
	const userHash = await hashPassword('user123');

	const [admin] = await db
		.insert(schema.accounts)
		.values({ name: 'Admin User', email: 'admin@example.com', password_hash: adminHash, role: 'admin' })
		.returning();

	const [user] = await db
		.insert(schema.accounts)
		.values({ name: 'General User', email: 'user@example.com', password_hash: userHash, role: 'general' })
		.returning();

	console.log(`  ${admin.email} (admin), ${user.email} (general)`);

	console.log('Seeding settings...');
	await db.insert(schema.settings).values({ key: 'page_num', value: '30' });

	console.log('Seeding project statuses...');
	await db.insert(schema.project_statuses).values([
		{ label: 'Lead', color: '#94a3b8', display_order: 10 },
		{ label: 'Proposal', color: '#3b82f6', display_order: 20 },
		{ label: 'Negotiation', color: '#f59e0b', display_order: 30 },
		{ label: 'Contract', color: '#8b5cf6', display_order: 40 },
		{ label: 'In Progress', color: '#10b981', display_order: 50 },
		{ label: 'Completed', color: '#6366f1', display_order: 60 },
		{ label: 'Cancelled', color: '#ef4444', display_order: 70 }
	]);

	console.log('Seeding project categories...');
	await db.insert(schema.project_categories).values([
		{ label: 'Development', display_order: 10 },
		{ label: 'Consulting', display_order: 20 },
		{ label: 'Support', display_order: 30 },
		{ label: 'Other', display_order: 40 }
	]);

	console.log('Seeding workflow categories...');
	await db.insert(schema.workflow_categories).values([
		{ label: 'Purchase', color: '#3b82f6' },
		{ label: 'Expense', color: '#10b981' },
		{ label: 'Leave', color: '#f59e0b' },
		{ label: 'Other', color: '#6b7280' }
	]);

	console.log('Seeding customers...');
	const customerData = [
		{ name: 'Acme Corporation', email: 'info@acme.example.com', tel: '555-0100', status: 'active' as const },
		{ name: 'Globex Systems', email: 'contact@globex.example.com', tel: '555-0101', status: 'active' as const },
		{ name: 'Initech LLC', email: 'hello@initech.example.com', status: 'lead' as const },
		{ name: 'Umbrella Corp', email: 'info@umbrella.example.com', status: 'inactive' as const }
	];

	const customerRecords = await db.insert(schema.customers).values(customerData).returning();

	console.log('Seeding customer activities...');
	await db.insert(schema.customer_activities).values([
		{ customer_id: customerRecords[0].id, account_id: admin.id, type: 'call', note: 'Initial discovery call' },
		{ customer_id: customerRecords[0].id, account_id: user.id, type: 'email', note: 'Sent proposal' },
		{ customer_id: customerRecords[1].id, account_id: admin.id, type: 'meeting', note: 'On-site demo' }
	]);

	console.log('Seeding no-code app...');
	const [sampleApp] = await db
		.insert(schema.apps)
		.values({
			name: 'Contact Form',
			description: 'Sample contact form app',
			fields: JSON.stringify([
				{ id: 'f1', type: 'text', label: 'Full Name', required: true, show_in_list: true },
				{ id: 'f2', type: 'text', label: 'Company', required: false, show_in_list: true },
				{ id: 'f3', type: 'text', label: 'Email', required: true, show_in_list: true },
				{ id: 'f4', type: 'textarea', label: 'Message', required: false }
			]),
			is_published: true
		})
		.returning();

	console.log('Done! Seed data created successfully.');
	console.log('');
	console.log('Login credentials:');
	console.log('  Admin: admin@example.com / admin123');
	console.log('  User:  user@example.com / user123');

	await proxy.dispose();
}

seed().catch(console.error);
