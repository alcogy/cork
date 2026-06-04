import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { hashPassword } from '../auth/index';

async function seed() {
	const proxy = await getPlatformProxy<{ DB: D1Database }>();
	const db = drizzle(proxy.env.DB, { schema });

	// ── Clear all existing data ──────────────────────────────────────────────
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
	await db.delete(schema.login_attempts);
	await db.delete(schema.settings);
	await db.delete(schema.accounts);

	// ── Pre-generate UUIDs ───────────────────────────────────────────────────
	const A = {
		ciaran:    crypto.randomUUID(),
		siobhan:   crypto.randomUUID(),
		sean:      crypto.randomUUID(),
		aoife:     crypto.randomUUID(),
		padraig:   crypto.randomUUID(),
		niamh:     crypto.randomUUID(),
		declan:    crypto.randomUUID(),
		fionnuala: crypto.randomUUID(),
		ruairi:    crypto.randomUUID()
	};

	const C = {
		emerald:    crypto.randomUUID(),
		celtic:     crypto.randomUUID(),
		shannon:    crypto.randomUUID(),
		liffey:     crypto.randomUUID(),
		boyne:      crypto.randomUUID(),
		galway:     crypto.randomUUID(),
		cliffs:     crypto.randomUUID(),
		connemara:  crypto.randomUUID(),
		tara:       crypto.randomUUID(),
		wicklow:    crypto.randomUUID(),
		killarney:  crypto.randomUUID(),
		cashel:     crypto.randomUUID()
	};

	const P = {
		portal:    crypto.randomUUID(),
		crm:       crypto.randomUUID(),
		cloud:     crypto.randomUUID(),
		erp:       crypto.randomUUID(),
		redesign:  crypto.randomUUID(),
		mobile:    crypto.randomUUID(),
		fintech:   crypto.randomUUID(),
		support:   crypto.randomUUID()
	};

	const W = {
		infra:    crypto.randomUUID(),
		copilot:  crypto.randomUUID(),
		summit:   crypto.randomUUID(),
		leave1:   crypto.randomUUID(),
		adobe:    crypto.randomUUID(),
		dinner:   crypto.randomUUID(),
		laptops:  crypto.randomUUID(),
		leave2:   crypto.randomUUID(),
		berlin:   crypto.randomUUID(),
		ergo:     crypto.randomUUID()
	};

	const APP = {
		equipment: crypto.randomUUID(),
		okr:       crypto.randomUUID(),
		bug:       crypto.randomUUID()
	};

	const WBS_ID = crypto.randomUUID();

	// ── Accounts ─────────────────────────────────────────────────────────────
	console.log('Seeding accounts...');
	const pwAdmin = await hashPassword('admin123');
	const pwUser  = await hashPassword('user123');

	await db.insert(schema.accounts).values([
		{ id: A.ciaran,    email: 'admin@example.com',               password_hash: pwAdmin, name: "Ciarán O'Brien",     role: 'admin' },
		{ id: A.siobhan,   email: 'user@example.com',                password_hash: pwUser,  name: 'Siobhán Murphy',     role: 'general' },
		{ id: A.sean,      email: 'sean.fitzgerald@celtec.ie',       password_hash: pwUser,  name: 'Seán Fitzgerald',    role: 'general' },
		{ id: A.aoife,     email: 'aoife.kelly@celtec.ie',           password_hash: pwUser,  name: 'Aoife Kelly',        role: 'general' },
		{ id: A.padraig,   email: 'padraig.connolly@celtec.ie',      password_hash: pwUser,  name: 'Padraig Connolly',   role: 'general' },
		{ id: A.niamh,     email: 'niamh.walsh@celtec.ie',           password_hash: pwUser,  name: 'Niamh Walsh',        role: 'general' },
		{ id: A.declan,    email: 'declan.mccarthy@celtec.ie',       password_hash: pwUser,  name: 'Declan McCarthy',    role: 'general' },
		{ id: A.fionnuala, email: 'fionnuala.brennan@celtec.ie',     password_hash: pwUser,  name: 'Fionnuala Brennan',  role: 'general' },
		{ id: A.ruairi,    email: 'ruairi.osullivan@celtec.ie',      password_hash: pwUser,  name: "Ruairí O'Sullivan",  role: 'general' }
	]);

	// ── Settings ─────────────────────────────────────────────────────────────
	console.log('Seeding settings...');
	await db.insert(schema.settings).values({ key: 'page_num', value: '30' });

	// ── Project statuses ─────────────────────────────────────────────────────
	console.log('Seeding project statuses...');
	const statuses = await db.insert(schema.project_statuses).values([
		{ label: 'Lead',        color: '#94a3b8', display_order: 10 },
		{ label: 'Proposal',    color: '#3b82f6', display_order: 20 },
		{ label: 'Negotiation', color: '#f59e0b', display_order: 30 },
		{ label: 'Contract',    color: '#8b5cf6', display_order: 40 },
		{ label: 'In Progress', color: '#10b981', display_order: 50 },
		{ label: 'Completed',   color: '#6366f1', display_order: 60 },
		{ label: 'Cancelled',   color: '#ef4444', display_order: 70 }
	]).returning();

	const ST = Object.fromEntries(statuses.map((s) => [s.label, s.id])) as Record<string, number>;

	// ── Project categories ───────────────────────────────────────────────────
	console.log('Seeding project categories...');
	const categories = await db.insert(schema.project_categories).values([
		{ label: 'Development', display_order: 10 },
		{ label: 'Consulting',  display_order: 20 },
		{ label: 'Support',     display_order: 30 },
		{ label: 'Other',       display_order: 40 }
	]).returning();

	const CAT = Object.fromEntries(categories.map((c) => [c.label, c.id])) as Record<string, number>;

	// ── Workflow categories ──────────────────────────────────────────────────
	console.log('Seeding workflow categories...');
	const wfCats = await db.insert(schema.workflow_categories).values([
		{ label: 'Purchase', color: '#3b82f6' },
		{ label: 'Expense',  color: '#10b981' },
		{ label: 'Leave',    color: '#f59e0b' },
		{ label: 'Other',    color: '#6b7280' }
	]).returning();

	const WC = Object.fromEntries(wfCats.map((c) => [c.label, c.id])) as Record<string, string>;

	// ── Customers ────────────────────────────────────────────────────────────
	console.log('Seeding customers...');
	await db.insert(schema.customers).values([
		{ id: C.emerald,   name: 'Emerald Coast Solutions Ltd',    email: 'info@emeraldcoast.ie',   tel: '+353 1 234 5678', address: '14 Merrion Square, Dublin 2', zipcode: 'D02 XY12', status: 'active' },
		{ id: C.celtic,    name: 'Celtic Ventures Group plc',      email: 'contact@celticventures.ie', tel: '+353 1 345 6789', address: '8 Grand Canal Dock, Dublin 4', zipcode: 'D04 AB34', status: 'active' },
		{ id: C.shannon,   name: 'Shannon Digital Partners',       email: 'hello@shannondigital.ie',tel: '+353 61 401 200', address: '3 Thomas Street, Limerick', zipcode: 'V94 CD56', status: 'active' },
		{ id: C.liffey,    name: 'Liffey Technologies Ltd',        email: 'info@liffeytec.ie',      tel: '+353 1 567 8901', address: '22 Sir John Rogerson Quay, Dublin 2', zipcode: 'D02 EF78', status: 'active' },
		{ id: C.boyne,     name: 'Boyne Valley Consulting',        email: 'team@boynevalley.ie',    tel: '+353 41 987 6543', address: '5 Fair Street, Drogheda', zipcode: 'A92 GH90', status: 'active' },
		{ id: C.galway,    name: 'Galway Bay Software Ltd',        email: 'dev@galwaybay.ie',       tel: '+353 91 567 890', address: '17 Eyre Square, Galway', zipcode: 'H91 IJ12', status: 'active' },
		{ id: C.cliffs,    name: 'Cliffs of Moher Media',          email: 'media@cliffsofmoher.ie', tel: '+353 65 708 1234', address: '2 O\'Connell Street, Ennis', zipcode: 'V95 KL34', status: 'lead' },
		{ id: C.connemara, name: 'Connemara Cloud Ltd',            email: 'cloud@connemaracloud.ie',tel: '+353 95 312 456', address: '9 Main Street, Clifden', zipcode: 'H71 MN56', status: 'lead' },
		{ id: C.tara,      name: 'Tara Hill Analytics',            email: 'data@tarahill.ie',       tel: '+353 53 912 3456', address: '1 Redmond Square, Wexford', zipcode: 'Y35 OP78', status: 'lead' },
		{ id: C.wicklow,   name: 'Wicklow Web Works',              email: 'web@wicklowworks.ie',    tel: '+353 404 67 890', address: '6 Main Street, Wicklow Town', zipcode: 'A67 QR90', status: 'inactive' },
		{ id: C.killarney, name: 'Killarney Financial Services',   email: 'finance@killarneyfin.ie',tel: '+353 64 663 1200', address: '11 High Street, Killarney', zipcode: 'V93 ST12', status: 'active' },
		{ id: C.cashel,    name: 'Cashel Data Systems Ltd',        email: 'info@casheldatasys.ie',  tel: '+353 62 612 345', address: '3 Friar Street, Thurles', zipcode: 'E41 UV34', status: 'active' }
	]);

	// Contacts
	console.log('Seeding contacts...');
	await db.insert(schema.contacts).values([
		{ customer_id: C.emerald,   name: 'Brendan Kavanagh',    email: 'b.kavanagh@emeraldcoast.ie',   tel: '+353 86 111 2222', department: 'Technology',   position: 'CTO' },
		{ customer_id: C.emerald,   name: 'Mairéad Ní Fhaoláin', email: 'm.nifhaolain@emeraldcoast.ie', tel: '+353 87 333 4444', department: 'Procurement',  position: 'Procurement Manager' },
		{ customer_id: C.celtic,    name: 'Oisín Treacy',         email: 'o.treacy@celticventures.ie',   tel: '+353 86 555 6666', department: 'IT',           position: 'Head of IT' },
		{ customer_id: C.celtic,    name: 'Clodagh Dempsey',      email: 'c.dempsey@celticventures.ie',  tel: '+353 87 777 8888', department: 'Finance',      position: 'CFO' },
		{ customer_id: C.shannon,   name: 'Tadgh Quinlan',        email: 't.quinlan@shannondigital.ie',  tel: '+353 86 999 0000', department: 'Engineering',  position: 'Lead Engineer' },
		{ customer_id: C.liffey,    name: 'Eimear Dunne',         email: 'e.dunne@liffeytec.ie',         tel: '+353 87 111 3333', department: 'Operations',   position: 'COO' },
		{ customer_id: C.liffey,    name: 'Cormac Healy',         email: 'c.healy@liffeytec.ie',         tel: '+353 86 444 5555', department: 'Development',  position: 'VP Engineering' },
		{ customer_id: C.boyne,     name: 'Sorcha Flanagan',      email: 's.flanagan@boynevalley.ie',    tel: '+353 87 666 7777', department: 'Consulting',   position: 'Principal Consultant' },
		{ customer_id: C.galway,    name: 'Daithí Mac Aodha',     email: 'd.macaodha@galwaybay.ie',      tel: '+353 86 888 9999', department: 'Product',      position: 'Product Manager' },
		{ customer_id: C.killarney, name: 'Sinéad Cronin',        email: 's.cronin@killarneyfin.ie',     tel: '+353 87 222 3333', department: 'Technology',   position: 'IT Director' },
		{ customer_id: C.cashel,    name: 'Colm Bourke',          email: 'c.bourke@casheldatasys.ie',    tel: '+353 86 444 6666', department: 'Data',         position: 'Chief Data Officer' },
		{ customer_id: C.cliffs,    name: 'Roisín MacNamara',     email: 'r.macnamara@cliffsofmoher.ie', tel: '+353 87 555 7777', department: 'Business Dev', position: 'Business Development' }
	]);

	// Customer activities
	console.log('Seeding customer activities...');
	await db.insert(schema.customer_activities).values([
		{ customer_id: C.emerald,   account_id: A.ciaran,  type: 'meeting', note: 'Kick-off meeting for customer portal project. Agreed on Phase 1 scope and timeline.' },
		{ customer_id: C.emerald,   account_id: A.siobhan, type: 'email',   note: 'Sent Phase 1 requirements document for review.' },
		{ customer_id: C.emerald,   account_id: A.sean,    type: 'call',    note: 'Technical architecture call with Brendan. Discussed API integration approach.' },
		{ customer_id: C.celtic,    account_id: A.declan,  type: 'meeting', note: 'CRM integration discovery workshop. Mapped existing Salesforce data model.' },
		{ customer_id: C.celtic,    account_id: A.ciaran,  type: 'call',    note: 'Follow-up on migration timeline. Agreed to extend by 2 weeks.' },
		{ customer_id: C.shannon,   account_id: A.padraig, type: 'meeting', note: 'Cloud readiness assessment. Identified 3 legacy systems needing refactoring.' },
		{ customer_id: C.shannon,   account_id: A.ruairi,  type: 'email',   note: 'Sent AWS architecture proposal. Awaiting sign-off from their board.' },
		{ customer_id: C.liffey,    account_id: A.siobhan, type: 'meeting', note: 'ERP requirements workshop, Day 1. Covered Finance and HR modules.' },
		{ customer_id: C.liffey,    account_id: A.sean,    type: 'meeting', note: 'ERP requirements workshop, Day 2. Covered Supply Chain and Reporting.' },
		{ customer_id: C.liffey,    account_id: A.ciaran,  type: 'call',    note: 'Contract negotiation call with Eimear and Cormac. Near agreement.' },
		{ customer_id: C.boyne,     account_id: A.aoife,   type: 'email',   note: 'Sent redesign proposal deck. Awaiting stakeholder review.' },
		{ customer_id: C.galway,    account_id: A.padraig, type: 'call',    note: 'Sprint 3 review call. App store submission planned for next sprint.' },
		{ customer_id: C.galway,    account_id: A.niamh,   type: 'meeting', note: 'UX walkthrough with Daithí. Minor navigation changes requested.' },
		{ customer_id: C.killarney, account_id: A.ruairi,  type: 'meeting', note: 'Dashboard requirements session. Regulatory reporting is top priority.' },
		{ customer_id: C.cashel,    account_id: A.declan,  type: 'call',    note: 'Data pipeline scoping call. Agreed on 3-month pilot engagement.' },
		{ customer_id: C.cliffs,    account_id: A.ciaran,  type: 'email',   note: 'Intro email following referral from Galway Bay Software. Sent company profile.' },
		{ customer_id: C.connemara, account_id: A.siobhan, type: 'call',    note: 'Initial discovery call. Very interested in managed Kubernetes offering.' },
		{ customer_id: C.tara,      account_id: A.aoife,   type: 'email',   note: 'Sent data analytics platform brochure. Following up next week.' }
	]);

	// Customer notes
	console.log('Seeding customer notes...');
	await db.insert(schema.customer_notes).values([
		{ customer_id: C.emerald,   account_id: A.ciaran,  color: 'yellow', content: 'Key decision maker is Brendan Kavanagh (CTO). Mairéad controls budget sign-off. Always copy both.' },
		{ customer_id: C.emerald,   account_id: A.siobhan, color: 'blue',   content: 'Phase 2 scope includes mobile app. Estimated +€80k. Surface in next QBR.' },
		{ customer_id: C.celtic,    account_id: A.declan,  color: 'green',  content: 'Legacy Salesforce data has duplicate records — needs deduplication sprint before migration.' },
		{ customer_id: C.liffey,    account_id: A.siobhan, color: 'yellow', content: 'CFO Clodagh wants monthly billing, not milestone. Build into contract template.' },
		{ customer_id: C.liffey,    account_id: A.ciaran,  color: 'pink',   content: 'Competitor Accenture also pitching ERP. Our advantage: Irish support team and faster onboarding.' },
		{ customer_id: C.galway,    account_id: A.niamh,   color: 'blue',   content: 'Daithí loves async comms. Prefer Slack DMs over calls. Response usually within 2 hours.' },
		{ customer_id: C.killarney, account_id: A.ruairi,  color: 'orange', content: 'Must comply with Central Bank of Ireland reporting by Q4 2026 — hard deadline, no flexibility.' },
		{ customer_id: C.cashel,    account_id: A.declan,  color: 'yellow', content: 'Small team (4 data engineers) but high technical maturity. Can handle complex integrations.' },
		{ customer_id: C.cliffs,    account_id: A.ciaran,  color: 'green',  content: 'Warm referral from Daithí at Galway Bay. High likelihood to convert — prioritise.' },
		{ customer_id: C.connemara, account_id: A.siobhan, color: 'blue',   content: 'Budget approval needed from parent company in London. Decision expected by end of July.' }
	]);

	// Customer schedules (upcoming)
	console.log('Seeding customer schedules...');
	await db.insert(schema.customer_schedules).values([
		{ customer_id: C.emerald,   account_id: A.sean,    title: 'Phase 1 Sprint Review', start_at: '2026-06-10 10:00:00', end_at: '2026-06-10 11:30:00', note: 'Demo of portal dashboard to Brendan and Mairéad.' },
		{ customer_id: C.liffey,    account_id: A.siobhan, title: 'ERP Contract Signing',  start_at: '2026-06-12 14:00:00', end_at: '2026-06-12 15:00:00', note: 'Bring two signed copies. Ciaran to countersign.' },
		{ customer_id: C.galway,    account_id: A.padraig, title: 'Sprint 4 Planning',     start_at: '2026-06-16 09:00:00', end_at: '2026-06-16 10:30:00', note: 'Cover push notifications and offline mode stories.' },
		{ customer_id: C.killarney, account_id: A.ruairi,  title: 'Dashboard Prototype Review', start_at: '2026-06-18 11:00:00', end_at: '2026-06-18 12:00:00', note: 'Present Figma prototype. Focus on regulatory report layouts.' },
		{ customer_id: C.connemara, account_id: A.siobhan, title: 'Technical Deep Dive',   start_at: '2026-06-20 14:00:00', end_at: '2026-06-20 16:00:00', note: 'Architecture discussion with their DevOps team.' },
		{ customer_id: C.boyne,     account_id: A.aoife,   title: 'Proposal Presentation', start_at: '2026-06-24 10:00:00', end_at: '2026-06-24 11:00:00', note: 'Present redesign concept boards to Sorcha and board members.' },
		{ customer_id: C.cashel,    account_id: A.declan,  title: 'Pilot Kick-off',        start_at: '2026-07-01 09:00:00', end_at: '2026-07-01 10:30:00', note: 'Start of 3-month data pipeline pilot.' },
		{ customer_id: C.emerald,   account_id: A.ciaran,  title: 'Quarterly Business Review', start_at: '2026-07-08 10:00:00', end_at: '2026-07-08 12:00:00', note: 'Q2 review + Phase 2 scope discussion.' }
	]);

	// ── Projects ─────────────────────────────────────────────────────────────
	console.log('Seeding projects...');
	await db.insert(schema.projects).values([
		{ id: P.portal,   title: 'Emerald Coast Customer Portal',   description: 'Self-service customer portal with account management, order tracking, and support ticketing. Built on SvelteKit with a D1 database backend.', status_id: ST['In Progress'], category_id: CAT['Development'], priority: 'high',   start_date: '2026-01-10', end_date: '2026-08-29', created_by: A.ciaran,  display_order: 10 },
		{ id: P.crm,      title: 'Celtic Ventures CRM Integration', description: 'Full migration from Salesforce to an in-house CRM. Includes data cleansing, deduplication, and custom API integrations with their finance system.', status_id: ST['Completed'],   category_id: CAT['Development'], priority: 'medium', start_date: '2025-09-01', end_date: '2026-02-28', created_by: A.ciaran,  display_order: 20 },
		{ id: P.cloud,    title: 'Shannon Digital Cloud Migration',  description: 'Lift-and-shift of 12 on-prem services to AWS. Includes VPC setup, RDS migration, and CloudFront CDN configuration.', status_id: ST['In Progress'], category_id: CAT['Consulting'], priority: 'urgent', start_date: '2026-03-01', end_date: '2026-09-30', created_by: A.padraig, display_order: 30 },
		{ id: P.erp,      title: 'Liffey Technologies ERP Module',   description: 'Custom ERP module covering Finance, HR, and Supply Chain. Phase 1 covers Finance and reporting dashboards.', status_id: ST['Contract'],    category_id: CAT['Development'], priority: 'high',   start_date: '2026-05-01', end_date: '2026-12-31', created_by: A.siobhan, display_order: 40 },
		{ id: P.redesign, title: 'Boyne Valley Platform Redesign',   description: 'Complete UX/UI overhaul of their consulting platform. Involves user research, information architecture redesign, and front-end rebuild.', status_id: ST['Proposal'],    category_id: CAT['Development'], priority: 'medium', start_date: '2026-07-01', end_date: '2027-03-31', created_by: A.aoife,   display_order: 50 },
		{ id: P.mobile,   title: 'Galway Bay Mobile Application',    description: 'Cross-platform React Native app for field sales teams. Features offline sync, GPS check-in, and real-time CRM updates.', status_id: ST['In Progress'], category_id: CAT['Development'], priority: 'high',   start_date: '2026-02-15', end_date: '2026-09-15', created_by: A.padraig, display_order: 60 },
		{ id: P.fintech,  title: 'Killarney FinTech Dashboard',      description: 'Regulatory compliance dashboard for Central Bank of Ireland reporting. Real-time data ingestion from core banking system.', status_id: ST['Negotiation'], category_id: CAT['Development'], priority: 'urgent', start_date: '2026-06-01', end_date: '2026-11-30', created_by: A.ciaran,  display_order: 70 },
		{ id: P.support,  title: 'Wicklow Web Works Support',        description: 'Ongoing managed support contract covering hosting, security patches, and monthly maintenance releases.', status_id: ST['In Progress'], category_id: CAT['Support'],     priority: 'low',    start_date: '2026-01-01', end_date: '2026-12-31', created_by: A.declan,  display_order: 80 }
	]);

	// Project members
	await db.insert(schema.project_members).values([
		{ project_id: P.portal,   account_id: A.ciaran,    role: 'owner'  },
		{ project_id: P.portal,   account_id: A.siobhan,   role: 'member' },
		{ project_id: P.portal,   account_id: A.sean,      role: 'member' },
		{ project_id: P.portal,   account_id: A.aoife,     role: 'member' },
		{ project_id: P.crm,      account_id: A.ciaran,    role: 'owner'  },
		{ project_id: P.crm,      account_id: A.declan,    role: 'member' },
		{ project_id: P.crm,      account_id: A.niamh,     role: 'member' },
		{ project_id: P.cloud,    account_id: A.padraig,   role: 'owner'  },
		{ project_id: P.cloud,    account_id: A.ruairi,    role: 'member' },
		{ project_id: P.cloud,    account_id: A.declan,    role: 'member' },
		{ project_id: P.erp,      account_id: A.siobhan,   role: 'owner'  },
		{ project_id: P.erp,      account_id: A.sean,      role: 'member' },
		{ project_id: P.erp,      account_id: A.fionnuala, role: 'member' },
		{ project_id: P.redesign, account_id: A.aoife,     role: 'owner'  },
		{ project_id: P.redesign, account_id: A.niamh,     role: 'member' },
		{ project_id: P.mobile,   account_id: A.padraig,   role: 'owner'  },
		{ project_id: P.mobile,   account_id: A.niamh,     role: 'member' },
		{ project_id: P.mobile,   account_id: A.fionnuala, role: 'member' },
		{ project_id: P.mobile,   account_id: A.ruairi,    role: 'member' },
		{ project_id: P.fintech,  account_id: A.ciaran,    role: 'owner'  },
		{ project_id: P.fintech,  account_id: A.ruairi,    role: 'member' },
		{ project_id: P.fintech,  account_id: A.sean,      role: 'member' },
		{ project_id: P.support,  account_id: A.declan,    role: 'owner'  },
		{ project_id: P.support,  account_id: A.fionnuala, role: 'member' }
	]);

	// Project activities
	await db.insert(schema.project_activities).values([
		{ project_id: P.portal,   account_id: A.ciaran,  type: 'comment', content: 'Phase 1 scope confirmed with client. Starting API design this week.' },
		{ project_id: P.portal,   account_id: A.sean,    type: 'comment', content: 'Auth module complete. Moving on to customer profile API endpoints.' },
		{ project_id: P.portal,   account_id: A.siobhan, type: 'comment', content: 'UI components for dashboard are done. Need data integration next sprint.' },
		{ project_id: P.crm,      account_id: A.declan,  type: 'comment', content: 'Data migration complete. 14,832 contacts migrated. Zero data loss confirmed.' },
		{ project_id: P.crm,      account_id: A.ciaran,  type: 'comment', content: 'Project signed off by client. Entering 30-day hypercare period.' },
		{ project_id: P.cloud,    account_id: A.padraig, type: 'comment', content: 'VPC and networking layer deployed. Starting database migration to RDS next week.' },
		{ project_id: P.cloud,    account_id: A.ruairi,  type: 'comment', content: 'Discovered that legacy system #7 uses a deprecated Oracle driver. Escalating to client.' },
		{ project_id: P.erp,      account_id: A.siobhan, type: 'comment', content: 'Requirements sign-off received. Development sprint plan shared with Liffey Technologies.' },
		{ project_id: P.mobile,   account_id: A.padraig, type: 'comment', content: 'Sprint 3 velocity: 42 points. On track for September release.' },
		{ project_id: P.mobile,   account_id: A.niamh,   type: 'comment', content: 'UX feedback from Daithí incorporated. New navigation structure approved.' },
		{ project_id: P.fintech,  account_id: A.ciaran,  type: 'comment', content: 'Contract negotiations underway. Sinéad confirmed CBI deadline is non-negotiable.' },
		{ project_id: P.support,  account_id: A.declan,  type: 'comment', content: 'May maintenance release deployed. No issues reported in 48-hour monitoring window.' }
	]);

	// WBS for Emerald Coast Portal project
	console.log('Seeding WBS...');
	await db.insert(schema.wbs).values({
		id: WBS_ID,
		project_id: P.portal,
		title: 'Emerald Coast Customer Portal — Phase 1',
		description: 'Phase 1 delivery: Authentication, Customer Profile, Dashboard, and Order Tracking modules.',
		start_date: '2026-01-10',
		end_date: '2026-08-29',
		created_by: A.ciaran
	});

	// Split into two batches to stay within D1's 100-parameter limit (11 cols × 9 rows = 99)
	await db.insert(schema.wbs_tasks).values([
		{ wbs_id: WBS_ID, name: 'Project setup & CI/CD pipeline',    status: 'done',        assignee_id: A.sean,    planned_start: '2026-01-10', planned_end: '2026-01-17', sort_order: 0 },
		{ wbs_id: WBS_ID, name: 'Authentication module (PBKDF2)',    status: 'done',        assignee_id: A.sean,    planned_start: '2026-01-18', planned_end: '2026-02-07', sort_order: 1 },
		{ wbs_id: WBS_ID, name: 'Customer profile API',             status: 'done',        assignee_id: A.siobhan, planned_start: '2026-02-10', planned_end: '2026-02-28', sort_order: 2 },
		{ wbs_id: WBS_ID, name: 'Dashboard UI components',          status: 'done',        assignee_id: A.aoife,   planned_start: '2026-02-10', planned_end: '2026-03-07', sort_order: 3 },
		{ wbs_id: WBS_ID, name: 'Order tracking integration',       status: 'in_progress', assignee_id: A.sean,    planned_start: '2026-03-10', planned_end: '2026-04-18', sort_order: 4 },
		{ wbs_id: WBS_ID, name: 'Support ticketing module',         status: 'in_progress', assignee_id: A.siobhan, planned_start: '2026-04-01', planned_end: '2026-05-16', sort_order: 5 },
		{ wbs_id: WBS_ID, name: 'Notifications & email alerts',     status: 'in_progress', assignee_id: A.aoife,   planned_start: '2026-04-21', planned_end: '2026-05-30', sort_order: 6 },
		{ wbs_id: WBS_ID, name: 'Performance optimisation & caching', status: 'todo',      assignee_id: A.sean,    planned_start: '2026-06-02', planned_end: '2026-06-27', sort_order: 7 },
		{ wbs_id: WBS_ID, name: 'UAT & client feedback round',      status: 'todo',        assignee_id: A.ciaran,  planned_start: '2026-06-30', planned_end: '2026-07-25', sort_order: 8 }
	]);
	await db.insert(schema.wbs_tasks).values([
		{ wbs_id: WBS_ID, name: 'Production deployment & go-live',  status: 'todo',        assignee_id: A.ciaran,  planned_start: '2026-07-28', planned_end: '2026-08-08', sort_order: 9 },
		{ wbs_id: WBS_ID, name: 'Hypercare & handover documentation', status: 'todo',      assignee_id: A.siobhan, planned_start: '2026-08-11', planned_end: '2026-08-29', sort_order: 10 }
	]);

	// ── Workflows ─────────────────────────────────────────────────────────────
	console.log('Seeding workflows...');
	await db.insert(schema.workflows).values([
		{
			id: W.infra,   title: 'Q2 Cloud Infrastructure Upgrade',
			description: 'Upgrade AWS reserved instances and add two additional RDS read replicas to support growing customer load. Estimated savings of €3,200/yr after Reserved Instance pricing.',
			category_id: WC['Purchase'], amount: 14500, status: 'approved', priority: 'high',
			requester_id: A.padraig, submitted_at: '2026-05-08 09:00:00', completed_at: '2026-05-14 16:30:00'
		},
		{
			id: W.copilot, title: 'GitHub Copilot Enterprise — Annual License',
			description: 'Annual GitHub Copilot Enterprise subscription for the engineering team (8 seats). Improves developer productivity by an estimated 20–30% on boilerplate-heavy tasks.',
			category_id: WC['Purchase'], amount: 2400, status: 'in_review', priority: 'normal',
			requester_id: A.declan, submitted_at: '2026-06-02 10:15:00'
		},
		{
			id: W.summit,  title: 'Dublin Web Summit 2026 — Team Attendance',
			description: 'Two tickets to Web Summit Dublin 2026 for Aoife and Niamh. Excellent networking opportunity and chance to demo our no-code platform to potential clients.',
			category_id: WC['Expense'], amount: 1850, status: 'approved', priority: 'normal',
			requester_id: A.aoife, submitted_at: '2026-04-22 11:00:00', completed_at: '2026-04-25 14:00:00'
		},
		{
			id: W.leave1,  title: 'Annual Leave Request — Siobhán Murphy (June)',
			description: 'Annual leave: 23 June to 4 July 2026 (9 working days). Cover arranged with Fionnuala for the ERP project.',
			category_id: WC['Leave'],   amount: null, status: 'submitted', priority: 'normal',
			requester_id: A.siobhan, submitted_at: '2026-06-03 08:30:00'
		},
		{
			id: W.adobe,   title: 'Adobe Creative Suite — Annual Renewal',
			description: 'Renewal of Adobe CC licences for the design team (3 seats): Niamh, Aoife, and Fionnuala. Current subscription expires 31 July 2026.',
			category_id: WC['Purchase'], amount: 960, status: 'draft', priority: 'low',
			requester_id: A.niamh
		},
		{
			id: W.dinner,  title: 'Client Dinner — Liffey Technologies',
			description: 'Team dinner at Chapter One Restaurant following the ERP contract signing. Attended by Siobhán, Seán, Eimear Dunne (Liffey COO) and Cormac Healy.',
			category_id: WC['Expense'], amount: 340, status: 'approved', priority: 'low',
			requester_id: A.sean, submitted_at: '2026-06-13 09:00:00', completed_at: '2026-06-13 17:00:00'
		},
		{
			id: W.laptops, title: 'Developer Workstations ×3 (Q3 Hiring)',
			description: 'MacBook Pro M4 Max (16-inch) for three new engineers starting in Q3. Spec: 48GB RAM, 2TB SSD. Approved in headcount plan. Delivery needed by 4 August.',
			category_id: WC['Purchase'], amount: 9600, status: 'in_review', priority: 'high',
			requester_id: A.ruairi, submitted_at: '2026-05-28 14:00:00'
		},
		{
			id: W.leave2,  title: 'Parental Leave — Fionnuala Brennan',
			description: 'Maternity leave: 14 July 2026 to 13 April 2027 (39 weeks). Cover plan attached. ERP project handover to Siobhán from week of 7 July.',
			category_id: WC['Leave'],   amount: null, status: 'submitted', priority: 'urgent',
			requester_id: A.fionnuala, submitted_at: '2026-06-01 09:00:00'
		},
		{
			id: W.berlin,  title: 'Berlin Tech Conference — Travel & Accommodation',
			description: 'Return flight Dublin–Berlin and 3-night hotel for Aoife to present at the European SaaS Summit. Speaking slot confirmed.',
			category_id: WC['Expense'], amount: 2100, status: 'rejected', priority: 'normal',
			requester_id: A.aoife, submitted_at: '2026-05-12 11:00:00', completed_at: '2026-05-16 15:00:00'
		},
		{
			id: W.ergo,    title: 'Office Ergonomic Equipment — Batch Order',
			description: 'Ergonomic chairs (×6), sit-stand desks (×4), and monitor arms (×8) for the Sandyford office. Following occupational health review recommendations.',
			category_id: WC['Purchase'], amount: 1800, status: 'draft', priority: 'low',
			requester_id: A.padraig
		}
	]);

	// Workflow approvals
	console.log('Seeding workflow approvals...');
	await db.insert(schema.workflow_approvals).values([
		// infra: approved (Ciarán step1 ✓, Siobhán step2 ✓)
		{ workflow_id: W.infra,   approver_id: A.ciaran,  step_order: 1, status: 'approved', approved_at: '2026-05-12 10:00:00', comment: 'Approved. Reserved Instance pricing makes this a clear win.' },
		{ workflow_id: W.infra,   approver_id: A.siobhan, step_order: 2, status: 'approved', approved_at: '2026-05-14 16:30:00', comment: 'Finance confirmed. Proceed.' },

		// copilot: in_review (Ciarán step1 ✓, Siobhán step2 pending)
		{ workflow_id: W.copilot, approver_id: A.ciaran,  step_order: 1, status: 'approved', approved_at: '2026-06-03 09:00:00', comment: 'Good productivity tool. Recommending approval.' },
		{ workflow_id: W.copilot, approver_id: A.siobhan, step_order: 2, status: 'pending' },

		// summit: approved (Ciarán step1 ✓)
		{ workflow_id: W.summit,  approver_id: A.ciaran,  step_order: 1, status: 'approved', approved_at: '2026-04-25 14:00:00', comment: 'Approved. Good visibility opportunity.' },

		// leave1: submitted (Ciarán step1 pending)
		{ workflow_id: W.leave1,  approver_id: A.ciaran,  step_order: 1, status: 'pending' },

		// adobe: draft (no approvals yet, but approvers set)
		{ workflow_id: W.adobe,   approver_id: A.ciaran,  step_order: 1, status: 'pending' },
		{ workflow_id: W.adobe,   approver_id: A.siobhan, step_order: 2, status: 'pending' },

		// dinner: approved (Ciarán step1 ✓)
		{ workflow_id: W.dinner,  approver_id: A.ciaran,  step_order: 1, status: 'approved', approved_at: '2026-06-13 17:00:00', comment: 'Approved. Well within allowance.' },

		// laptops: in_review (Ciarán step1 ✓, Siobhán step2 pending)
		{ workflow_id: W.laptops, approver_id: A.ciaran,  step_order: 1, status: 'approved', approved_at: '2026-05-29 11:00:00', comment: 'Consistent with Q3 hiring plan. Approved.' },
		{ workflow_id: W.laptops, approver_id: A.siobhan, step_order: 2, status: 'pending' },

		// leave2: submitted (Ciarán step1 pending, HR Siobhán step2 pending)
		{ workflow_id: W.leave2,  approver_id: A.ciaran,    step_order: 1, status: 'pending' },
		{ workflow_id: W.leave2,  approver_id: A.siobhan,   step_order: 2, status: 'pending' },

		// berlin: rejected (Ciarán step1 ✓, Siobhán step2 ✗)
		{ workflow_id: W.berlin,  approver_id: A.ciaran,  step_order: 1, status: 'approved', approved_at: '2026-05-13 09:00:00', comment: 'Good opportunity, passing to finance.' },
		{ workflow_id: W.berlin,  approver_id: A.siobhan, step_order: 2, status: 'rejected', approved_at: '2026-05-16 15:00:00', comment: 'Over Q2 travel budget cap of €1,500. Please resubmit in Q3.' },

		// ergo: draft (no approvals yet)
		{ workflow_id: W.ergo,    approver_id: A.ciaran,  step_order: 1, status: 'pending' }
	]);

	// Workflow comments
	await db.insert(schema.workflow_comments).values([
		{ workflow_id: W.infra,   account_id: A.padraig, content: 'AWS pricing locked in until 2028 with this plan. Savings compound over time.' },
		{ workflow_id: W.infra,   account_id: A.ciaran,  content: 'Approved. Please coordinate deployment window with Declan to avoid client impact.' },
		{ workflow_id: W.copilot, account_id: A.declan,  content: 'Also evaluated Tabnine and Cursor. Copilot has best Svelte/TypeScript support for our stack.' },
		{ workflow_id: W.laptops, account_id: A.ruairi,  content: 'Lead time from Apple Business is 10–14 working days. Need approval by 15 June for August start dates.' },
		{ workflow_id: W.laptops, account_id: A.ciaran,  content: 'Can we get 3-year AppleCare included? Check if it fits under contingency.' },
		{ workflow_id: W.berlin,  account_id: A.aoife,   content: 'Speaking slot is confirmed — this is a significant opportunity for brand visibility. Can we revisit?' },
		{ workflow_id: W.berlin,  account_id: A.siobhan, content: 'Happy to reconsider in Q3. If the talk recording gets good traction, it strengthens the case.' },
		{ workflow_id: W.leave2,  account_id: A.fionnuala, content: 'Handover document for ERP project sent to Siobhán. Available for questions until 11 July.' }
	]);

	// ── No-code Apps ─────────────────────────────────────────────────────────
	console.log('Seeding no-code apps...');
	await db.insert(schema.apps).values([
		{
			id: APP.equipment,
			name: 'Equipment Request',
			description: 'Request hardware, software licences, or office equipment. Submitted requests go to line manager for approval.',
			fields: JSON.stringify([
				{ id: 'f1', type: 'text',     label: 'Item Name',         required: true,  show_in_list: true,  placeholder: 'e.g. MacBook Pro 14"' },
				{ id: 'f2', type: 'select',   label: 'Category',          required: true,  show_in_list: true,  options: [{ label: 'Hardware' }, { label: 'Software' }, { label: 'Office' }, { label: 'Other' }] },
				{ id: 'f3', type: 'number',   label: 'Estimated Cost (€)', required: true,  show_in_list: true },
				{ id: 'f4', type: 'textarea', label: 'Business Justification', required: true, show_in_list: false },
				{ id: 'f5', type: 'date',     label: 'Required By',       required: false, show_in_list: true }
			]),
			is_published: true
		},
		{
			id: APP.okr,
			name: 'Quarterly OKR Tracker',
			description: 'Track team objectives and key results each quarter. Updated monthly.',
			fields: JSON.stringify([
				{ id: 'f1', type: 'text',     label: 'Objective',         required: true,  show_in_list: true },
				{ id: 'f2', type: 'text',     label: 'Key Result',        required: true,  show_in_list: true },
				{ id: 'f3', type: 'user',     label: 'Owner',             required: true,  show_in_list: true },
				{ id: 'f4', type: 'select',   label: 'Status',            required: true,  show_in_list: true,  options: [{ label: 'On Track' }, { label: 'At Risk' }, { label: 'Off Track' }, { label: 'Done' }] },
				{ id: 'f5', type: 'number',   label: 'Progress (%)',      required: false, show_in_list: true }
			]),
			is_published: true
		},
		{
			id: APP.bug,
			name: 'Bug Report',
			description: 'Log and track bugs found during QA or production. Triage happens weekly.',
			fields: JSON.stringify([
				{ id: 'f1', type: 'text',     label: 'Title',             required: true,  show_in_list: true },
				{ id: 'f2', type: 'select',   label: 'Severity',          required: true,  show_in_list: true,  options: [{ label: 'Critical' }, { label: 'High' }, { label: 'Medium' }, { label: 'Low' }] },
				{ id: 'f3', type: 'select',   label: 'Project',           required: true,  show_in_list: true,  options: [{ label: 'Customer Portal' }, { label: 'ERP Module' }, { label: 'Mobile App' }, { label: 'FinTech Dashboard' }] },
				{ id: 'f4', type: 'textarea', label: 'Steps to Reproduce', required: true, show_in_list: false },
				{ id: 'f5', type: 'user',     label: 'Reported By',       required: false, show_in_list: true },
				{ id: 'f6', type: 'select',   label: 'Status',            required: true,  show_in_list: true,  options: [{ label: 'Open' }, { label: 'In Progress' }, { label: 'Fixed' }, { label: 'Won\'t Fix' }] }
			]),
			is_published: true
		}
	]);

	// App records
	console.log('Seeding app records...');
	await db.insert(schema.app_records).values([
		// Equipment Request records
		{ app_id: APP.equipment, created_by: A.declan,    data: JSON.stringify({ f1: 'MacBook Pro M4 Max 16"', f2: 'Hardware', f3: '3200', f4: 'Required for new senior engineer joining Q3. Current machine is 4 years old and struggles with local dev containers.', f5: '2026-07-28' }) },
		{ app_id: APP.equipment, created_by: A.niamh,     data: JSON.stringify({ f1: 'Figma Organisation Plan (1 year)', f2: 'Software', f3: '576', f4: 'Upgrading from Professional to Organisation plan to allow version history and branching for the Boyne Valley project.', f5: '2026-06-30' }) },
		{ app_id: APP.equipment, created_by: A.fionnuala, data: JSON.stringify({ f1: 'Herman Miller Aeron Chair', f2: 'Office', f3: '1450', f4: 'Current chair causing back pain. Occupational health assessment recommends ergonomic upgrade. Ref: OH-2026-04.', f5: '2026-07-15' }) },
		{ app_id: APP.equipment, created_by: A.ruairi,    data: JSON.stringify({ f1: '4K External Monitor ×2', f2: 'Hardware', f3: '760', f4: 'For the two Galway Bay mobile developers. iOS simulator performance is significantly better on external displays.', f5: '2026-06-20' }) },
		{ app_id: APP.equipment, created_by: A.aoife,     data: JSON.stringify({ f1: 'iPad Pro + Apple Pencil', f2: 'Hardware', f3: '1199', f4: 'For UX prototyping and client presentation sketching. Will be shared within the design team.', f5: '2026-07-01' }) },

		// OKR Tracker records
		{ app_id: APP.okr, created_by: A.ciaran,   data: JSON.stringify({ f1: 'Expand Irish enterprise client base', f2: 'Sign 3 new clients with ARR > €150k each', f3: A.ciaran,  f4: 'On Track',  f5: '67' }) },
		{ app_id: APP.okr, created_by: A.siobhan,  data: JSON.stringify({ f1: 'Improve project delivery quality',   f2: 'Achieve < 5% unplanned scope change across all active projects', f3: A.siobhan, f4: 'At Risk',  f5: '40' }) },
		{ app_id: APP.okr, created_by: A.padraig,  data: JSON.stringify({ f1: 'Build cloud practice capability',   f2: 'Gain 4 AWS certifications by Q3 end',  f3: A.padraig, f4: 'On Track',  f5: '75' }) },
		{ app_id: APP.okr, created_by: A.aoife,    data: JSON.stringify({ f1: 'Launch internal design system',     f2: 'Publish v1.0 component library with 40+ components', f3: A.aoife,   f4: 'Off Track', f5: '30' }) },

		// Bug Report records
		{ app_id: APP.bug, created_by: A.sean,      data: JSON.stringify({ f1: 'Session token not invalidated on password change', f2: 'Critical', f3: 'Customer Portal', f4: '1. Log in as any user. 2. Change password. 3. Observe old session cookie still authenticates.', f5: A.sean,      f6: 'In Progress' }) },
		{ app_id: APP.bug, created_by: A.siobhan,   data: JSON.stringify({ f1: 'ERP Finance report CSV export truncates at 1000 rows', f2: 'High', f3: 'ERP Module', f4: '1. Go to Finance > Reports. 2. Export any report with > 1000 rows. 3. Observe CSV stops at row 1000.', f5: A.siobhan,   f6: 'Open' }) },
		{ app_id: APP.bug, created_by: A.padraig,   data: JSON.stringify({ f1: 'Mobile app GPS check-in fails on Android 15', f2: 'High', f3: 'Mobile App', f4: '1. Open app on Android 15 device. 2. Navigate to Check In. 3. Tap "Check In Now". 4. Location permission granted but coordinates return 0,0.', f5: A.padraig,   f6: 'In Progress' }) },
		{ app_id: APP.bug, created_by: A.niamh,     data: JSON.stringify({ f1: 'Dark mode: date picker text invisible', f2: 'Medium', f3: 'Customer Portal', f4: '1. Enable dark mode. 2. Open any form with a date field. 3. Text in date picker uses black-on-dark-grey, unreadable.', f5: A.niamh,     f6: 'Fixed' }) },
		{ app_id: APP.bug, created_by: A.ruairi,    data: JSON.stringify({ f1: 'FinTech dashboard chart tooltip flickers on hover', f2: 'Low', f3: 'FinTech Dashboard', f4: '1. Load regulatory overview chart. 2. Hover over any data point. 3. Tooltip appears and disappears rapidly.', f5: A.ruairi,    f6: 'Open' }) },
		{ app_id: APP.bug, created_by: A.fionnuala, data: JSON.stringify({ f1: 'ERP HR module: leave balance rounds down incorrectly', f2: 'Medium', f3: 'ERP Module', f4: '1. Set annual leave entitlement to 23.5 days. 2. Observe dashboard shows 23 days. Expected: 23.5 days.', f5: A.fionnuala, f6: 'Open' }) }
	]);

	// ── Done ─────────────────────────────────────────────────────────────────
	console.log('\nDone! Seed data created successfully.');
	console.log('');
	console.log('Login credentials:');
	console.log('  Admin:   admin@example.com / admin123');
	console.log('  User:    user@example.com  / user123');
	console.log('');
	console.log('Additional accounts (all password: user123):');
	console.log('  sean.fitzgerald@celtec.ie');
	console.log('  aoife.kelly@celtec.ie');
	console.log('  padraig.connolly@celtec.ie');
	console.log('  niamh.walsh@celtec.ie');
	console.log('  declan.mccarthy@celtec.ie');
	console.log('  fionnuala.brennan@celtec.ie');
	console.log('  ruairi.osullivan@celtec.ie');

	await proxy.dispose();
}

seed().catch(console.error);
