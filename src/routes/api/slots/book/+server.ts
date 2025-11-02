import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';

// src/routes/api/book-slot/[id]/+server.ts
import { json } from '@sveltejs/kit';

// Assumiamo che la sessione o il token utente sia gestito in un modo sicuro,
// ad esempio tramite un cookie HTTP-only con il token JWT di Firebase.
// La funzione GET qui sotto è solo un esempio di come leggere l'utente.
// La tua implementazione reale potrebbe variare.

export async function POST({ request, cookies, locals }) {

    const userID = locals.userID;
    const name = locals.name ?? locals.email;
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        return json({ error: 'Il corpo della richiesta non è un JSON valido.' }, { status: 400 });
    }
    
    const { slotId } = requestBody;

    if (!slotId) {
        return json({ error: 'L\'ID dello slot è richiesto nel corpo della richiesta.' }, { status: 400 });
    }

    // Esempio fittizio di come leggere l'ID utente dalla sessione/token.
    // In un'applicazione reale, dovresti decodificare il token JWT
    // e validare l'utente in modo sicuro.
    const user = { uid: userID, name }; // Sostituisci con la logica di autenticazione

    if (!user || !user.uid) {
        return json({ error: 'Utente non autenticato' }, { status: 401 });
    }

    // Usiamo una transazione per garantire l'atomicità dell'operazione
    const slotRef = db.collection('slots').doc(slotId);

    try {
        await db.runTransaction(async (transaction) => {
            const slotDoc = await transaction.get(slotRef);

            if (!slotDoc.exists) {
                throw new Error('Lo slot non esiste.');
            }

            const slotData: any = slotDoc.data();
            if (slotData.status !== 'AVAILABLE') {
                throw new Error('Questo slot non è disponibile.');
            }

            // Aggiorna il documento con le informazioni di booking
            transaction.update(slotRef, {
                status: 'BOOKED',
                speakerUid: user.uid,
                speakerName: user.name,
                bookedAt: new Date().getTime(),//admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return json({ message: 'Slot prenotato con successo!' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore durante la prenotazione: ' + e.message }, { status: 500 });
    }
}