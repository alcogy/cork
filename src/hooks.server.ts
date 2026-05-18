import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth/index';

let platform: App.Platform;

export const handle: Handle = async ({ event, resolve }) => {
	if (dev) {
		const { getPlatformProxy } = await import('wrangler');
		platform ??= (await getPlatformProxy()) as unknown as App.Platform;
		event.platform = platform;
	}

	const session = await getSession(event);

	if (session) {
		event.locals.user = {
			id: session.id,
			email: session.email,
			name: session.name,
			role: session.role
		};
	} else {
		event.locals.user = null;
	}

	const lang = event.cookies.get('cork_lang');
	event.locals.locale = lang === 'en' || lang === 'ja' ? lang : 'en';

	const publicRoutes = ['/login'];
	const isPublicRoute = publicRoutes.some((route) => event.url.pathname === route);

	if (!event.locals.user && !isPublicRoute) {
		return new Response(null, {
			status: 302,
			headers: { location: '/login' }
		});
	}

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
