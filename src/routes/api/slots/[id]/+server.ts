import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_STATUSES = ['AVAILABLE', 'BOOKED', 'DONE', 'PROBLEMA', 'ANNULLATO'] as const;

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = params;
    let body: { status?: string };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    if (!body.status || !VALID_STATUSES.includes(body.status as any)) {
        return json({ error: `Status non valido. Valori accettati: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    try {
        await db.collection('slots').doc(id).update({ status: body.status });
        return json({ message: 'Status aggiornato' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};
