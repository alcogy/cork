export const FIELD_TYPES = [
	'text',
	'textarea',
	'link',
	'number',
	'date',
	'datetime',
	'select',
	'checkbox',
	'radio',
	'user'
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
	text: 'Single-line text',
	textarea: 'Multi-line text',
	link: 'URL / Link',
	number: 'Number',
	date: 'Date',
	datetime: 'Date & Time',
	select: 'Dropdown',
	checkbox: 'Checkbox',
	radio: 'Radio button',
	user: 'User selector'
};

export interface FieldOption {
	id: string;
	label: string;
}

export interface AppField {
	id: string;
	type: FieldType;
	label: string;
	required: boolean;
	show_in_list?: boolean;
	placeholder?: string;
	options?: FieldOption[];
}

export interface AppDef {
	id: string;
	name: string;
	description: string;
	fields: AppField[];
	is_published: boolean;
	created_at: string;
	updated_at: string;
}

export interface AppSummary {
	id: string;
	name: string;
	description: string;
	field_count: number;
	record_count: number;
	is_published: boolean;
	created_at: string;
	updated_at: string;
}
