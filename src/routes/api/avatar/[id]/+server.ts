import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const key = `avatars/${params.id}`;
	const obj = await platform!.env.STORAGE.get(key);
	if (!obj) throw error(404, 'Not found');

	const contentType = obj.httpMetadata?.contentType ?? 'image/jpeg';
	return new Response(await obj.arrayBuffer(), {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
