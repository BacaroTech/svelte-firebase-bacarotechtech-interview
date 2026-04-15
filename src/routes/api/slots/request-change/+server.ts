import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notifyAdmins } from '$lib/firebase/notify-admins.server';

export const POST: RequestHandler = async ({ request }) => {
    let body: { token?: string; requestedSlotId?: string; note?: string };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    const { token, requestedSlotId, note = '' } = body;

    if (!token || !requestedSlotId) {
        return json({ error: 'token e requestedSlotId sono richiesti' }, { status: 400 });
    }

    // Resolve speaker
    const speakerSnap = await db.collection('speakers')
        .where('token', '==', token)
        .limit(1)
        .get();

    if (speakerSnap.empty) {
        return json({ error: 'Token non valido' }, { status: 401 });
    }

    const speakerDoc = speakerSnap.docs[0];
    const speaker = speakerDoc.data();

    if (speaker.status !== 'booked') {
        return json({ error: 'Non hai ancora una prenotazione attiva' }, { status: 400 });
    }

    // Find current slot
    const currentSlotSnap = await db.collection('slots')
        .where('speakerUid', '==', speakerDoc.id)
        .where('status', '==', 'BOOKED')
        .limit(1)
        .get();

    if (currentSlotSnap.empty) {
        return json({ error: 'Slot corrente non trovato' }, { status: 404 });
    }

    const currentSlot = currentSlotSnap.docs[0];

    // Verify requested slot is available
    const requestedSlotDoc = await db.collection('slots').doc(requestedSlotId).get();

    if (!requestedSlotDoc.exists) {
        return json({ error: 'Slot richiesto non trovato' }, { status: 404 });
    }

    if (requestedSlotDoc.data()!.status !== 'AVAILABLE') {
        return json({ error: 'Lo slot richiesto non è disponibile' }, { status: 409 });
    }

    // Write change request
    await db.collection('change_requests').add({
        speakerDocId: speakerDoc.id,
        speakerName: speaker.name as string,
        eventId: speaker.eventId as string,
        currentSlotId: currentSlot.id,
        currentSlotTime: currentSlot.data().startTime as string,
        requestedSlotId,
        requestedSlotTime: requestedSlotDoc.data()!.startTime as string,
        note: note.slice(0, 500),
        status: 'pending',
        createdAt: new Date().toISOString()
    });

    // Notify admin
    const currentHora = new Date(currentSlot.data().startTime as string)
        .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    const requestedHora = new Date(requestedSlotDoc.data()!.startTime as string)
        .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

    await notifyAdmins(
        '🔄 Richiesta cambio slot',
        `${speaker.name}: ${currentHora} → ${requestedHora}${note ? ` — "${note.slice(0, 60)}"` : ''}`
    );

    return json({ message: 'Richiesta inviata con successo' }, { status: 200 });
};
