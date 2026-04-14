import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { getMessaging } from 'firebase-admin/messaging';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    let body: { token?: string; email?: string };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    const { token, email = 'test' } = body;
    if (!token) {
        return json({ error: 'token FCM richiesto' }, { status: 400 });
    }

    // Verifica che il token esista nel db
    const tokenDoc = await db.collection('fcm_tokens').doc(token).get();
    if (!tokenDoc.exists) {
        return json({ error: 'Token non registrato nel db' }, { status: 404 });
    }

    try {
        await getMessaging().send({
            token,
            notification: {
                title: '🔔 Test notifica',
                body: `notifica sono ${email}`
            },
            webpush: {
                notification: {
                    title: '🔔 Test notifica',
                    body: `notifica sono ${email}`,
                    icon: '/icons/icon-192x192.png'
                }
            }
        });
        return json({ message: 'Notifica inviata' });
    } catch (e: any) {
        return json({ error: 'Invio fallito: ' + e.message }, { status: 500 });
    }
};
