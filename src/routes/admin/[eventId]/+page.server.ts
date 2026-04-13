import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import { VALID_EVENT_IDS, EVENT_CONFIG } from '$lib/config/events';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { InterviewSlot, Speaker } from '$lib/type/slots';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params }) => {
    const { eventId } = params;

    if (!VALID_EVENT_IDS.includes(eventId as any)) {
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
    const baseUrl = env.PUBLIC_BASE_URL ?? 'http://localhost:5173';

    return { slots, speakers, eventId, eventConfig, baseUrl };
};
