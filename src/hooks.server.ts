// src/hooks.server.ts
import { createHash } from 'crypto';
import { ADMIN_PASSWORD } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

export const handle = (async ({ event, resolve }) => {
    if (event.url.pathname.startsWith('/.well-known/appspecific/com.chrome.devtools')) {
        return new Response(null, { status: 204 });
    }

    const adminCookie = event.cookies.get('__admin_session');
    const expectedHash = ADMIN_PASSWORD ? hashPassword(ADMIN_PASSWORD) : null;
    event.locals.isAdmin = !!(adminCookie && expectedHash && adminCookie === expectedHash);

    return resolve(event);
}) satisfies Handle;
