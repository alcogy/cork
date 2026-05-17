export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	urgent: 'Urgent'
};

export const PROJECT_MEMBER_ROLES = ['owner', 'member', 'viewer'] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export interface ProjectStatus {
	id: number;
	label: string;
	color: string;
	display_order: number;
}

export interface ProjectCategory {
	id: number;
	label: string;
	display_order: number;
}

export interface Project {
	id: string;
	title: string;
	description: string | null;
	status_id: number | null;
	category_id: number | null;
	priority: ProjectPriority;
	start_date: string | null;
	end_date: string | null;
	display_order: number;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface ProjectMember {
	id: string;
	project_id: string;
	account_id: string;
	role: ProjectMemberRole;
	assigned_at: string;
}

export interface ProjectActivity {
	id: string;
	project_id: string;
	account_id: string;
	type: string;
	content: string;
	metadata: string | null;
	created_at: string;
}
