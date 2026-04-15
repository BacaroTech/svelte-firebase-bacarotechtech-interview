import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const crRef = db.collection('change_requests').doc(params.id);
    const crDoc = await crRef.get();

    if (!crDoc.exists) {
        return json({ error: 'Richiesta non trovata' }, { status: 404 });
    }

    if (crDoc.data()!.status !== 'pending') {
        return json({ error: 'Richiesta già gestita' }, { status: 409 });
    }

    await crRef.update({ status: 'dismissed' });

    return json({ message: 'Chiuso' }, { status: 200 });
};
