// src/hooks.server.ts
import { createHash } from 'crypto';
import { ADMIN_PASSWORD } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

// Computed once at startup
const EXPECTED_HASH = ADMIN_PASSWORD ? hashPassword(ADMIN_PASSWORD) : null;

export const handle = (async ({ event, resolve }) => {
    if (event.url.pathname.startsWith('/.well-known/appspecific/com.chrome.devtools')) {
        return new Response(null, { status: 204 });
    }

    // Admin session
    const adminCookie = event.cookies.get('__admin_session');
    event.locals.isAdmin = !!(adminCookie && EXPECTED_HASH && adminCookie === EXPECTED_HASH);

    // Speaker session (persist token from URL to cookie)
    const urlToken = event.url.searchParams.get('token');
    if (urlToken) {
        event.cookies.set('__speaker_token', urlToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 24 ore
        });
    }

    return resolve(event);
}) satisfies Handle;
