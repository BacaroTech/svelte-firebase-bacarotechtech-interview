import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { token } = params;

    try {
        const snapshot = await db.collection('speakers')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return json({ error: 'Speaker non trovato' }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        return json({ ...doc.data(), docId: doc.id }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};
