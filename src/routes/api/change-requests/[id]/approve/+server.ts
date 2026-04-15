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

    const cr = crDoc.data()!;

    if (cr.status !== 'pending') {
        return json({ error: 'Richiesta già gestita' }, { status: 409 });
    }

    if (cr.type === 'change') {
        // Transazione: libera slot attuale, prenota quello richiesto
        await db.runTransaction(async (tx) => {
            const currentSlotRef = db.collection('slots').doc(cr.currentSlotId);
            const requestedSlotRef = db.collection('slots').doc(cr.requestedSlotId);
            const speakerRef = db.collection('speakers').doc(cr.speakerDocId);

            const [currentSlot, requestedSlot] = await Promise.all([
                tx.get(currentSlotRef),
                tx.get(requestedSlotRef)
            ]);

            if (!currentSlot.exists || !requestedSlot.exists) {
                throw new Error('Slot non trovato');
            }
            if (requestedSlot.data()!.status !== 'AVAILABLE') {
                throw new Error('Lo slot richiesto non è più disponibile');
            }

            tx.update(currentSlotRef, {
                status: 'AVAILABLE',
                speakerUid: null,
                speakerName: null,
                bookedAt: null
            });
            tx.update(requestedSlotRef, {
                status: 'BOOKED',
                speakerUid: cr.speakerDocId,
                speakerName: cr.speakerName,
                bookedAt: new Date().toISOString()
            });
            tx.update(speakerRef, { status: 'booked' });
            tx.update(crRef, { status: 'approved' });
        });
    } else {
        // type === 'release': libera lo slot, speaker torna pending
        await db.runTransaction(async (tx) => {
            const currentSlotRef = db.collection('slots').doc(cr.currentSlotId);
            const speakerRef = db.collection('speakers').doc(cr.speakerDocId);

            tx.update(currentSlotRef, {
                status: 'AVAILABLE',
                speakerUid: null,
                speakerName: null,
                bookedAt: null
            });
            tx.update(speakerRef, { status: 'pending' });
            tx.update(crRef, { status: 'approved' });
        });
    }

    return json({ message: 'Approvato' }, { status: 200 });
};
