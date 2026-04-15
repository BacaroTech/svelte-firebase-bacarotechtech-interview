import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { speakerId } = params;

    const docRef = db.collection('speakers').doc(speakerId);
    const doc = await docRef.get();

    if (!doc.exists) {
        return json({ error: 'Speaker non trovato' }, { status: 404 });
    }

    const newToken = uuidv4();
    await docRef.update({ token: newToken, activatedAt: null });

    return json({ token: newToken }, { status: 200 });
};
