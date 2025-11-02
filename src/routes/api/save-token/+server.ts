import { adminFirestore as adminDB } from '$lib/firebase/firebase-admin.server';
import { FieldValue } from 'firebase-admin/firestore';

import {
  error,
  json,
} from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      throw error(400, 'Token non valido o mancante');
    }

    // Usiamo il token stesso come ID del documento per evitare duplicati
    const tokenRef = adminDB.collection('fcm_tokens').doc(token);

    // Salviamo il token con un timestamp
    await tokenRef.set({
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true }); // 'merge: true' aggiorna il timestamp se il token esiste già

    return json({ success: true, message: 'Token salvato con successo' });

  } catch (err) {
    console.error("Errore nel salvataggio del token:", err);
    throw error(500, 'Impossibile salvare il token');
  }
}