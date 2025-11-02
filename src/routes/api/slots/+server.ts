import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import type {
  InterviewSlot,
  SpeakerDetails,
} from '$lib/type/slots';
import { v4 as uuidv4 } from 'uuid';

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

// Funzione helper per generare un ID pseudo-casuale (simula l'UUID di Firestore)
function generateFakeId(): string {
    return 'slot_' + Math.random().toString(36).substring(2, 9);
}

// 2. Dati Fittizi degli Speaker (Denormalizzazione)
// Questo oggetto simula la collezione /speakers che verrebbe letta per denormalizzare i dati.
const speakerData: SpeakerDetails = {
    name: 'tizio',
    uid: 'abc123',
};
const enableMock = false
function mockSlot() {
    const today = new Date();
    const eventId = 'conf_2025_tech';

    // Array di slot per la demo
    const fakeSlots: InterviewSlot[] = [
        // Slot 1: Disponibile
        {
            docId: generateFakeId(),
            id: generateFakeId(),
            eventId: eventId,
            startTime: new Date(today.setHours(10, 30, 0, 0)).toISOString(),
            endTime: new Date(today.setHours(11, 0, 0, 0)).toISOString(),
            status: 'AVAILABLE',
            speakerUid: null,
            speakerName: null,
            bookedAt: null,
        },
        // Slot 2: Disponibile
        {
            docId: generateFakeId(),
            id: generateFakeId(),
            eventId: eventId,
            startTime: new Date(today.setHours(11, 0, 0, 0)).toISOString(),
            endTime: new Date(today.setHours(11, 30, 0, 0)).toISOString(),
            status: 'AVAILABLE',
            speakerUid: null,
            speakerName: null,
            bookedAt: null,
        },
        // Slot 3: Prenotato
        {
            docId: generateFakeId(),
            id: generateFakeId(),
            eventId: eventId,
            startTime: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
            endTime: new Date(today.setHours(14, 30, 0, 0)).toISOString(),
            status: 'BOOKED',
            // Usa il secondo speaker (indice 1)
            speakerUid: speakerData.uid,
            speakerName: speakerData.name,

            bookedAt: new Date().toISOString(),
        },
        // Slot 4: Disponibile (Più tardi)
        {
            docId: generateFakeId(),
            id: generateFakeId(),
            eventId: eventId,
            startTime: new Date(today.setHours(15, 0, 0, 0)).toISOString(),
            endTime: new Date(today.setHours(15, 30, 0, 0)).toISOString(),
            status: 'AVAILABLE',
            speakerUid: null,
            speakerName: null,
            bookedAt: null,
        }
    ];

    // Restituisce l'array JSON di slot
    return json({
        slots: fakeSlots,
        total: fakeSlots.length,
        timestamp: new Date().toISOString()
    });
}

async function readFirebaseSlot() {
    try {
        const slotsSnapshot = await adminFirestore.collection('slots').get()

        const slots = slotsSnapshot.docs.map(doc => ({            
            ...doc.data(),
            docId: doc.id
        }));
        return json(slots, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore durante la lettura degli slot: ' + e.message }, { status: 500 });
    }
}
/**
 * Gestisce la richiesta GET per recuperare i dati degli slot fittizi.
 */
export const GET: RequestHandler = async () => {
    if (enableMock)
        return mockSlot();
    else
        return readFirebaseSlot();
};

export async function POST({ request }) {
    const { name, startTime, endTime } = await request.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!name || !startTime || !endTime) {
        return json({ error: 'Nome e orario sono richiesti.' }, { status: 400 });
    }
    
    const [hoursStart, minutesStart] = startTime.split(':').map(Number);
    const _startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hoursStart, minutesStart);

    const [hoursEnd, minutesEnd] = endTime.split(':').map(Number);
    const _endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hoursEnd, minutesEnd);

    try {
        const slotData = {
            id: uuidv4(),
            name,
            startTime: _startTime,
            endTime: _endTime,
            status: 'AVAILABLE',
            speakerUid: null,
            speakerName: null,
            bookedAt: null,
            // Usiamo un timestamp del server per la coerenza TODO
            createdAt: new Date().getTime()// admin.firestore.FieldValue.serverTimestamp()
        }
        const slotDocRef = adminFirestore.collection('slots').doc();
        await slotDocRef.set(slotData, { merge: true })

        return json({ message: 'Slot aggiunto con successo!' }, { status: 201 });
    } catch (e: any) {
        return json({ error: 'Errore del server: ' + e.message }, { status: 500 });
    }
}
async function deleteCollection(collectionPath: string, batchSize: number) {
	const collectionRef = adminFirestore.collection(collectionPath);
	const query = collectionRef.orderBy('__name__').limit(batchSize);

	return new Promise((resolve, reject) => {
		deleteQueryBatch(query, resolve).catch(reject);
	});
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value?: unknown) => void) {
	const snapshot = await query.get();

	if (snapshot.size === 0) {
		resolve();
		return;
	}

	const batch = adminFirestore.batch();
	snapshot.docs.forEach((doc) => {
		batch.delete(doc.ref);
	});
	await batch.commit();

	process.nextTick(() => {
		deleteQueryBatch(query, resolve);
	});
}
export const DELETE: RequestHandler = async () => {
	try {
        
        console.log("deleting....")
        const slotsSnapshot = await adminFirestore.collection('slots').get()
        const count = slotsSnapshot.docs.length;
        await deleteCollection('slots', 500); 
      		
		console.log(`Eliminati ${count} slot.`);
		return json({ message: `Tutti gli slot (${count}) sono stati eliminati con successo.` }, { status: 200 });
	} catch (error) {
		console.error("Errore durante l'eliminazione degli slot:", error);
		return json({ message: 'Errore interno del server.' }, { status: 500 });
	}
};