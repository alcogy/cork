export const CUSTOMER_STATUSES = ['active', 'inactive', 'lead'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
	active: 'Active',
	inactive: 'Inactive',
	lead: 'Lead'
};

export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
	call: 'Call',
	email: 'Email',
	meeting: 'Meeting',
	note: 'Note'
};

export const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'orange'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Customer {
	id: string;
	name: string;
	zipcode: string | null;
	address: string | null;
	email: string | null;
	tel: string | null;
	fax: string | null;
	status: CustomerStatus;
	created_at: string;
	updated_at: string | null;
}

export interface Contact {
	id: string;
	customer_id: string;
	name: string;
	email: string | null;
	tel: string | null;
	department: string | null;
	position: string | null;
	note: string | null;
	created_at: string;
}

export interface CustomerActivity {
	id: string;
	customer_id: string;
	account_id: string;
	type: ActivityType;
	note: string | null;
	occurred_at: string;
}

export interface CustomerSchedule {
	id: string;
	customer_id: string;
	account_id: string;
	title: string;
	start_at: string;
	end_at: string | null;
	note: string | null;
	created_at: string;
}

export interface CustomerNote {
	id: string;
	customer_id: string;
	account_id: string;
	content: string;
	color: NoteColor;
	created_at: string;
}
