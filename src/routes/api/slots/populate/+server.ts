import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  let slotsData;
  try {
    slotsData = await request.json();
    if (!Array.isArray(slotsData)) {
      return json({ error: 'L\'input deve essere un array di slot.' }, { status: 400 });
    }
  } catch (e) {
    return json({ error: 'Formato JSON non valido.' }, { status: 400 });
  }

  const batch = db.batch();
  const slotsCollectionRef = db.collection('slots');

  // Determina la data di oggi per i timestamp
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    slotsData.forEach((slot, index) => {
      // Validazione e trasformazione dei dati per ogni slot
      if (!slot.time || !slot.name) {
        throw new Error(`Slot all'indice ${index} non valido: mancano i campi 'time' o 'name'.`);
      }

      // Estrai ore e minuti dall'orario stringa (es. "9:45")
      const [hours, minutes] = slot.time.split(':').map(Number);
      const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

      // Calcola l'orario di fine (assumendo una durata di 15 minuti)
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 15);

      const slotData = {
        id: uuidv4(),
        startTime: Timestamp.fromDate(startTime).toMillis(),
        endTime: Timestamp.fromDate(endTime).toMillis(),
        status: 'AVAILABLE',
        speakerUid: null,
        speakerName: null,
        bookedAt: null,
        // Usiamo un timestamp del server per la coerenza TODO
        createdAt: new Date().getTime()// admin.firestore.FieldValue.serverTimestamp()
      };

      // Aggiunge l'operazione di scrittura al batch
      const newSlotRef = slotsCollectionRef.doc();
      batch.set(newSlotRef, slotData);
    });

    // Esegue tutte le operazioni di scrittura in un'unica transazione
    await batch.commit();

    return json({ message: `${slotsData.length} slot aggiunti con successo!` }, { status: 201 });
  } catch (e: any) {
    return json({ error: 'Errore durante l\'aggiunta degli slot: ' + e.message }, { status: 500 });
  }
}