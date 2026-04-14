import { adminFirestore as adminDB } from '$lib/firebase/firebase-admin.server';
import { FieldValue } from 'firebase-admin/firestore';
import { error, json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { token, role } = body as { token?: string; role?: string };

    if (!token || typeof token !== 'string') {
      throw error(400, 'Token non valido o mancante');
    }

    const validRole = role === 'admin' ? 'admin' : 'speaker';

    const tokenRef = adminDB.collection('fcm_tokens').doc(token);
    await tokenRef.set({
      createdAt: FieldValue.serverTimestamp(),
      role: validRole,
    }, { merge: true });

    return json({ success: true, message: 'Token salvato con successo' });

  } catch (err) {
    console.error('Errore nel salvataggio del token:', err);
    throw error(500, 'Impossibile salvare il token');
  }
}