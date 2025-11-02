import { adminAuth } from '$lib/firebase/firebase-admin.server';

import {
  error,
  json,
} from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const { idToken } = await request.json();

    if (!idToken) {
        throw error(400, 'ID Token mancante');
    }

    try {
        // 1. Verifica e decodifica il Token ID
        const decodedIdToken = await adminAuth.verifyIdToken(idToken); // [26]

        // 2. Controllo di sicurezza: verifica che l'accesso sia recente (5 minuti)
        const FIVE_MINUTES = 5 * 60;
        if (Math.floor(Date.now() / 1000) - decodedIdToken.auth_time >= FIVE_MINUTES) {
            // Se l'autenticazione è troppo vecchia, reindirizza
            throw error(401, 'Autenticazione recente richiesta!'); // [9]
        }

        // 3. Crea il Session Cookie (valido per 5 giorni)
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn }); // [8]

        // 4. Imposta il Cookie HTTP-Only
        cookies.set('__session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true, // Impedisce l'accesso da JavaScript client-side [10]
            secure: process.env.NODE_ENV === 'production', // Richiede HTTPS in produzione
            path: '/',
        });

        // 5. Opzionale: gestire la pulizia di cookie/token obsoleti in caso di errore [3, 14]

        return json({ status: 'signedIn' });
    } catch (e) {
        console.error('Errore durante la creazione del cookie di sessione:', e);
        // In caso di errore (token scaduto o non valido), elimina qualsiasi sessione esistente
        cookies.delete('__session', { path: '/' });
        throw error(401, 'Richiesta non autorizzata o token non valido.');
    }
};
// [9]

// src/routes/api/session/+server.ts (DELETE handler)
export const DELETE: RequestHandler = async ({ cookies }) => {
    // Elimina il Session Cookie sicuro
    cookies.delete('__session', { path: '/' }); 
    // Opzionalmente, è possibile aggiungere qui la logica di revoca del token Admin SDK
    return json({ status: 'signedOut' });
}
// [9]