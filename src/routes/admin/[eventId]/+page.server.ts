import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import { VALID_EVENT_IDS, EVENT_CONFIG } from '$lib/config/events';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { InterviewSlot, Speaker } from '$lib/type/slots';
import { env } from '$env/dynamic/private';
import { v4 as uuidv4 } from 'uuid';
import statoAzure from '../../../../doc/stato.json';

export const load: PageServerLoad = async ({ params }) => {
    console.log("Admin page load - eventId:", params.eventId);
    const { eventId } = params;

    if (!VALID_EVENT_IDS.includes(eventId as any)) {
                console.warn(`Evento non valido: ${eventId}`);

        error(404, 'Evento non trovato');
    }

    const [slotsSnap, speakersSnap] = await Promise.all([
        adminFirestore.collection('slots').where('eventId', '==', eventId).get(),
        adminFirestore.collection('speakers').where('eventId', '==', eventId).get()
    ]);

    const slots: InterviewSlot[] = slotsSnap.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const speakers: Speaker[] = speakersSnap.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as Speaker));

    const eventConfig = EVENT_CONFIG[eventId as keyof typeof EVENT_CONFIG];
    const baseUrl = env.BASE_URL ?? 'http://localhost:5173';

    return { slots, speakers, eventId, eventConfig, baseUrl };
};

export const actions: Actions = {
    reseedSpeakers: async ({ params, locals }) => {
        if (!locals.isAdmin) return fail(403, { seedError: 'Non autorizzato' });

        const { eventId } = params;

        // Per ora solo azure-vicenza ha i dati in stato.json
        const statoByEvent: Record<string, typeof statoAzure> = {
            'azure-vicenza': statoAzure
        };
        const stato = statoByEvent[eventId];
        if (!stato) return fail(400, { seedError: `Nessun dato disponibile per l'evento "${eventId}"` });

        const baseUrl = env.PUBLIC_BASE_URL ?? 'http://localhost:5173';

        // Recupera gli slot correnti per impostare preferredSlots
        const slotsSnap = await adminFirestore
            .collection('slots')
            .where('eventId', '==', eventId)
            .get();

        // Raggruppa per ora UTC: colazione <10Z, mattina 10-12Z, pomeriggio >=12Z
        // (CEST = UTC+2 → 10:20 CEST = 08:20Z, 12:30 CEST = 10:30Z, 14:50 CEST = 12:50Z)
        const sorted = slotsSnap.docs.sort((a, b) => {
            const ta = (a.data().startTime as string) ?? '';
            const tb = (b.data().startTime as string) ?? '';
            return ta.localeCompare(tb);
        });

        const morningSlotIds = sorted
            .filter(d => { const h = new Date(d.data().startTime).getUTCHours(); return h >= 10 && h < 12; })
            .map(d => d.id);
        const afternoonSlotIds = sorted
            .filter(d => new Date(d.data().startTime).getUTCHours() >= 12)
            .map(d => d.id);

        // Mappa preferenze dal JSON
        const prefsMap: Record<string, { slot: string; note: string }> = {};
        stato.prenotazioni.forEach((p: { nome: string; slot: string; note: string }) => {
            prefsMap[p.nome] = { slot: p.slot, note: p.note };
        });

        // Cancella speaker esistenti per questo evento
        const existingSnap = await adminFirestore
            .collection('speakers')
            .where('eventId', '==', eventId)
            .get();
        if (!existingSnap.empty) {
            const deleteBatch = adminFirestore.batch();
            existingSnap.docs.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
        }

        // Crea nuovi speaker con token freschi
        const createBatch = adminFirestore.batch();
        const links: { nome: string; link: string }[] = [];

        for (const p of stato.partecipanti) {
            const nome: string = p.nome;
            const email: string | null = p.email ?? null;
            const token = uuidv4();
            const pref = prefsMap[nome];
            const preferredSlots = pref
                ? (pref.slot === 'mattina' ? morningSlotIds : afternoonSlotIds)
                : [];
            const notes = pref?.note ?? '';
            const isOptional = stato.opzionali.some((o: { nome: string }) => nome.startsWith(o.nome));

            const docRef = adminFirestore.collection('speakers').doc();
            createBatch.set(docRef, {
                name: nome,
                email: email ? email.toLowerCase() : null,
                talk: null,
                token,
                eventId,
                preferredSlots,
                notes,
                status: 'pending',
                optional: isOptional,
                createdAt: new Date().toISOString()
            });

            links.push({ nome, link: `${baseUrl}/${eventId}?token=${token}` });
        }

        await createBatch.commit();

        // Reset tutti gli slot dell'evento: AVAILABLE + pulisci campi booking
        const resetBatch = adminFirestore.batch();
        slotsSnap.docs.forEach(doc => {
            resetBatch.update(doc.ref, {
                status: 'AVAILABLE',
                speakerUid: null,
                speakerName: null,
                bookedAt: null
            });
        });
        await resetBatch.commit();

        return { seedLinks: links, seedCount: stato.partecipanti.length };
    }
};
