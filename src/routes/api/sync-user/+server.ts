import { ADMIN_EMAILS_LIST } from '$env/static/private';
import {
  adminAuth,
  adminFirestore,
} from '$lib/firebase/firebase-admin.server';

import {
  json,
  redirect,
} from '@sveltejs/kit';

/**
 * Endpoint per sincronizzare i dati utente da Auth a Firestore.
 * Deve essere chiamato dal client subito dopo la registrazione/login.
 */
export async function POST({ request }) {
    // 1. Recupera il token ID dal corpo della richiesta
    const { idToken, email, fcmToken } = await request.json();

    if (!email) {
        return json({ success: false, error: 'Email non trovata' }, { status: 400 });
    }
    if (!idToken) {
        return json({ success: false, error: 'Token non fornito' }, { status: 400 });
    }

    let decodedToken;
    let verified = false;
    try {
        // 2. VERIFICA SICURA del token ID con l'Admin SDK,
        decodedToken = await adminAuth.verifyIdToken(idToken);
        verified = true;
    } catch (error) {
        console.error('Errore di verifica token:', error);
        return json({ success: false, error: 'Token non valido' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    
    const userDocRef = adminFirestore.collection('users').doc(uid);

    // 3. Verifica se il documento esiste già (prevenzione scritture inutili)
    const doc = await userDocRef.get();

    const userExists = doc.exists;

    const isAdmin = email && ADMIN_EMAILS_LIST.includes(email)
    
    if (verified && userExists) {
        return redirect(303, isAdmin ? '/app/admin' : '/app/home');
    }

    // 4. CREAZIONE SICURA DEL DOCUMENTO FIRESTORE
    try {
        let role = 'standard'

        if (email && ADMIN_EMAILS_LIST.includes(email)) {
            role = 'admin';
            
            await adminAuth.setCustomUserClaims(uid, { admin: true });
        }

        const userData = {
            uid: uid,
            email: decodedToken.email,
            displayName: decodedToken.name || decodedToken.email,
            createdAt: new Date().getTime(),//serverTimestamp(),
            role: role,
            fcmToken: fcmToken
        };

        await userDocRef.set(userData, { merge: true });
                    
        return redirect(303, isAdmin ? '/app/admin' : '/app/onboarding');    

    } catch (error) {
        console.error('Errore durante la scrittura di Firestore:', error);
        return json({ success: false, error: 'Errore interno del server' }, { status: 500 });
    }
}