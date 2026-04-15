import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    let body: {
        name?: string;
        email?: string;
        talk?: string;
        eventId?: string;
        notes?: string;
        preferredSlots?: string[];
    };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    if (!body.name || !body.eventId) {
        return json({ error: 'name e eventId sono richiesti' }, { status: 400 });
    }

    const token = uuidv4();

    try {
        const docRef = db.collection('speakers').doc();
        await docRef.set({
            name: body.name,
            email: body.email ?? null,
            talk: body.talk ?? null,
            token,
            eventId: body.eventId,
            preferredSlots: body.preferredSlots ?? [],
            notes: body.notes ?? '',
            status: 'pending',
            activatedAt: null,
            createdAt: new Date().toISOString()
        });

        return json({ docId: docRef.id, token }, { status: 201 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};