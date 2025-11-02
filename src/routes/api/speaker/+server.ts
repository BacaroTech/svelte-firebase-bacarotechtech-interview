import { speakers } from '$lib/config/mock/fake-slot';
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

// Lista degli speaker da aggiungere (la stessa di prima)
const speakersToAdd = [...speakers];

// Gestisce POST /api/admin/speakers
export const POST: RequestHandler = async () => {
    try {
        const batch = db.batch();
        const speakersCollection = db.collection('speakers');

        console.log(`Inizio aggiunta di ${speakersToAdd.length} speaker...`);

        speakersToAdd.forEach((speaker) => {            
            const docRef = speakersCollection.doc(); // Crea un nuovo ID documento
            batch.set(docRef, speaker);
        });

        await batch.commit();

        console.log('Speaker aggiunti con successo.');
        return json({ message: `${speakersToAdd.length} speaker sono stati aggiunti con successo.` }, { status: 201 });
    } catch (error) {
        console.error("Errore durante l'aggiunta degli speaker:", error);
        return json({ message: 'Errore interno del server.' }, { status: 500 });
    }
};