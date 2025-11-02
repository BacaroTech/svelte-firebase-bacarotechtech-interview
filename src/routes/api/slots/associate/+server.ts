import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import type { InterviewSlot } from '$lib/type/slots';

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

async function readFirebaseSlot() {
    try {
        const slotsSnapshot = await db.collection('slots').get()

        const slots = slotsSnapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
        return slots as InterviewSlot[]
    } catch (e: any) {
        return null;
    }
}
export const POST: RequestHandler = async () => {
    try {
        const speakersSnapshot = await db.collection('speakers').get();
        const batch = db.batch();
        const speakerNameToIdMap = new Map<string, string>();
        speakersSnapshot.forEach((doc) => {
            speakerNameToIdMap.set(doc.data().name, doc.id);
        });

        const slotsData = await readFirebaseSlot();
        if (!slotsData) {
            return json({ message: 'Errore interno del server.' }, { status: 500 });

        }

        let count = 0;
        console.log(`Aggiunti ${count} nuovi slot.`);

        return json({ message: `${count} slot sono stati creati e associati con successo.` }, { status: 201 });

    } catch (error) {
        console.error("Errore durante la creazione degli slot:", error);
        return json({ message: 'Errore interno del server.' }, { status: 500 });
    }
};