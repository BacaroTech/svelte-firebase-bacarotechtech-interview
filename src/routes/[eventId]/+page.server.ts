import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import { VALID_EVENT_IDS, EVENT_CONFIG } from '$lib/config/events';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { InterviewSlot, Speaker } from '$lib/type/slots';

export const load: PageServerLoad = async ({ params, url }) => {
    const { eventId } = params;

    if (!VALID_EVENT_IDS.includes(eventId as any)) {
        error(404, 'Evento non trovato');
    }

    const token = url.searchParams.get('token');

    const slotsSnapshot = await adminFirestore
        .collection('slots')
        .where('eventId', '==', eventId)
        .get();

    const slots: InterviewSlot[] = slotsSnapshot.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const eventConfig = EVENT_CONFIG[eventId as keyof typeof EVENT_CONFIG];

    if (!token) {
        return { speaker: null, slots, eventId, eventConfig, tokenInvalid: false };
    }

    const speakerSnapshot = await adminFirestore
        .collection('speakers')
        .where('token', '==', token)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();

    if (speakerSnapshot.empty) {
        return { speaker: null, slots, eventId, eventConfig, tokenInvalid: true };
    }

    const speakerDoc = speakerSnapshot.docs[0];
    const speaker = { ...speakerDoc.data(), docId: speakerDoc.id } as Speaker;

    return { speaker, slots, eventId, eventConfig, tokenInvalid: false };
};
