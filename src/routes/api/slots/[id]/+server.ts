import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_STATUSES = ['AVAILABLE', 'BOOKED', 'DONE', 'PROBLEMA', 'ANNULLATO'] as const;

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = params;
    let body: { status?: string; speakerUid?: string | null };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    if (!body.status || !VALID_STATUSES.includes(body.status as any)) {
        return json({ error: `Status non valido. Valori accettati: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    try {
        // Leggi lo slot per trovare lo speaker corrente (serve in più casi)
        const slotDoc = await db.collection('slots').doc(id).get();
        const currentSpeakerUid = slotDoc.data()?.speakerUid as string | null;

        if (body.status === 'AVAILABLE') {
            await db.collection('slots').doc(id).update({
                status: 'AVAILABLE',
                speakerUid: null,
                speakerName: null,
                bookedAt: null
            });

            if (currentSpeakerUid) {
                await db.collection('speakers').doc(currentSpeakerUid).update({ status: 'pending' });
            }
        } else if (body.status === 'BOOKED' && body.speakerUid) {
            // Booking manuale admin: assegna speaker specifico
            const speakerDoc = await db.collection('speakers').doc(body.speakerUid).get();
            if (!speakerDoc.exists) {
                return json({ error: 'Speaker non trovato' }, { status: 404 });
            }
            const speakerName = speakerDoc.data()!.name as string;

            // Resetta lo speaker precedente se diverso
            if (currentSpeakerUid && currentSpeakerUid !== body.speakerUid) {
                await db.collection('speakers').doc(currentSpeakerUid).update({ status: 'pending' });
            }

            await db.collection('slots').doc(id).update({
                status: 'BOOKED',
                speakerUid: body.speakerUid,
                speakerName,
                bookedAt: new Date().toISOString()
            });
            await db.collection('speakers').doc(body.speakerUid).update({ status: 'booked' });
        } else {
            await db.collection('slots').doc(id).update({ status: body.status });
        }

        return json({ message: 'Status aggiornato' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};
