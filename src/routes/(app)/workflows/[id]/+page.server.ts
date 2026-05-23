import type { Actions, PageServerLoad } from './$types';
import { makeCtx } from '$lib/services';
import {
	getWorkflow,
	addApprover,
	removeApprover,
	addComment,
	submitWorkflow,
	approveWorkflow,
	rejectWorkflow,
	uploadWorkflowFile,
	deleteWorkflowFile
} from '$lib/services/workflow';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	return getWorkflow(makeCtx(platform!, locals), params.id);
};

export const actions = {
	addApprover: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return addApprover(makeCtx(platform!, locals), params.id, f.get('approver_id')?.toString() ?? '');
	},

	removeApprover: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return removeApprover(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},

	addComment: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return addComment(makeCtx(platform!, locals), params.id, { content: f.get('content')?.toString().trim() ?? '' });
	},

	submit: async ({ platform, params, locals }) => {
		return submitWorkflow(makeCtx(platform!, locals), params.id);
	},

	approve: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return approveWorkflow(makeCtx(platform!, locals), params.id, f.get('comment')?.toString().trim() || null);
	},

	reject: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return rejectWorkflow(makeCtx(platform!, locals), params.id, f.get('comment')?.toString().trim() || null);
	},

	uploadFile: async ({ request, platform, params, locals }) => {
		const f = await request.formData();
		return uploadWorkflowFile(makeCtx(platform!, locals), params.id, f.get('file') as File);
	},

	deleteFile: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteWorkflowFile(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	}
} satisfies Actions;
