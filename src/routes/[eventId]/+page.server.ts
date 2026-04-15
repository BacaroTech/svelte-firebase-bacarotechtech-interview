import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import { VALID_EVENT_IDS, EVENT_CONFIG } from '$lib/config/events';
import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { InterviewSlot, Speaker } from '$lib/type/slots';

const SPEAKER_COOKIE = '__speaker_token';
const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 giorni
};

export const load: PageServerLoad = async ({ params, url, cookies }) => {
    const { eventId } = params;

    if (!VALID_EVENT_IDS.includes(eventId as any)) {
        error(404, 'Evento non trovato');
    }

    // Se il token è nell'URL: salva in cookie e redirect alla URL pulita
    const tokenFromUrl = url.searchParams.get('token');
    if (tokenFromUrl) {
        cookies.set(SPEAKER_COOKIE, tokenFromUrl, COOKIE_OPTS);
        redirect(302, `/${eventId}`);
    }

    const slotsSnapshot = await adminFirestore
        .collection('slots')
        .where('eventId', '==', eventId)
        .get();

    const slots: InterviewSlot[] = slotsSnapshot.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const eventConfig = EVENT_CONFIG[eventId as keyof typeof EVENT_CONFIG];

    const token = cookies.get(SPEAKER_COOKIE);

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
        // Token in cookie non valido: lo cancella e mostra il form di login
        cookies.delete(SPEAKER_COOKIE, { path: '/' });
        return { speaker: null, slots, eventId, eventConfig, tokenInvalid: true };
    }

    const speakerDoc = speakerSnapshot.docs[0];
    const speaker = { ...speakerDoc.data(), docId: speakerDoc.id } as Speaker;

    return { speaker, slots, eventId, eventConfig, tokenInvalid: false };
};

export const actions: Actions = {
    emailLogin: async ({ request, params, cookies }) => {
        const formData = await request.formData();
        const email = ((formData.get('email') as string) ?? '').toLowerCase().trim();

        if (!email) return fail(400, { emailError: 'Inserisci la tua email' });

        const snap = await adminFirestore
            .collection('speakers')
            .where('email', '==', email)
            .where('eventId', '==', params.eventId)
            .limit(1)
            .get();

        if (snap.empty) {
            return fail(404, { emailError: 'Email non trovata. Contatta Michele su Telegram per ricevere il tuo link.' });
        }

        const token = snap.docs[0].data().token as string;
        cookies.set(SPEAKER_COOKIE, token, COOKIE_OPTS);
        redirect(302, `/${params.eventId}`);
    }
};
