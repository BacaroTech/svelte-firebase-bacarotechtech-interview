import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    let body: { slotId?: string; token?: string };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    const { slotId, token } = body;

    if (!slotId || !token) {
        return json({ error: 'slotId e token sono richiesti' }, { status: 400 });
    }

    // Resolve speaker from token
    const speakerSnapshot = await db.collection('speakers')
        .where('token', '==', token)
        .limit(1)
        .get();

    if (speakerSnapshot.empty) {
        return json({ error: 'Token non valido' }, { status: 401 });
    }

    const speakerDoc = speakerSnapshot.docs[0];
    const speakerName: string = speakerDoc.data().name;
    const speakerDocId: string = speakerDoc.id;

    const slotRef = db.collection('slots').doc(slotId);

    try {
        await db.runTransaction(async (transaction) => {
            const slotDoc = await transaction.get(slotRef);

            if (!slotDoc.exists) {
                throw new Error('Lo slot non esiste');
            }

            if (slotDoc.data()!.status !== 'AVAILABLE') {
                throw new Error('Questo slot non è disponibile');
            }

            transaction.update(slotRef, {
                status: 'BOOKED',
                speakerUid: speakerDocId,
                speakerName,
                bookedAt: new Date().toISOString()
            });

            transaction.update(speakerDoc.ref, { status: 'booked' });
        });

        return json({ message: 'Slot prenotato con successo!' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 400 });
    }
};