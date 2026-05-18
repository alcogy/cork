export const WORKFLOW_STATUSES = [
	'draft',
	'submitted',
	'in_review',
	'approved',
	'rejected',
	'cancelled'
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
	draft: 'Draft',
	submitted: 'Submitted',
	in_review: 'In Review',
	approved: 'Approved',
	rejected: 'Rejected',
	cancelled: 'Cancelled'
};

export const WORKFLOW_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type WorkflowPriority = (typeof WORKFLOW_PRIORITIES)[number];

export const WORKFLOW_PRIORITY_LABELS: Record<WorkflowPriority, string> = {
	low: 'Low',
	normal: 'Normal',
	high: 'High',
	urgent: 'Urgent'
};

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface WorkflowCategory {
	id: string;
	label: string;
	color: string;
	note: string | null;
	created_at: string;
}

export interface Workflow {
	id: string;
	title: string;
	description: string | null;
	category_id: string | null;
	amount: number | null;
	status: WorkflowStatus;
	priority: WorkflowPriority;
	requester_id: string;
	current_approver_id: string | null;
	submitted_at: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string | null;
}

export interface WorkflowApproval {
	id: string;
	workflow_id: string;
	approver_id: string;
	step_order: number;
	status: ApprovalStatus;
	comment: string | null;
	approved_at: string | null;
	created_at: string;
}

export interface WorkflowTemplate {
	id: string;
	title: string;
	template: string;
	account_id: string;
	sort_order: number;
	created_at: string;
	updated_at: string | null;
}
