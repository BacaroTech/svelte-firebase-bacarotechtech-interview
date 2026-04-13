import { createHash } from 'crypto';
import { ADMIN_PASSWORD } from '$env/static/private';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password') as string;

        if (!password || password !== ADMIN_PASSWORD) {
            return fail(401, { error: 'Password non valida' });
        }

        const hash = createHash('sha256').update(password).digest('hex');
        cookies.set('__admin_session', hash, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24
        });

        redirect(302, '/admin/azure-vicenza');
    }
};
