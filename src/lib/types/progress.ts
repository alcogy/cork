export interface WBS {
	id: string;
	title: string;
	description: string;
	start_date: string;
	end_date: string;
	created_by: string | null;
	created_at: string;
}

export interface WBSMember {
	wbs_id: string;
	account_id: string;
}

export interface WBSTask {
	id: string;
	wbs_id: string;
	name: string;
	assignee_id: string | null;
	planned_start: string;
	planned_end: string;
	actual_start: string;
	actual_end: string;
	progress: number;
	sort_order: number;
}
