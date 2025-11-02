import { adminFirestore } from '$lib/firebase/firebase-admin.server';

import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const userID = locals.userID;

    if (!userID) {
        throw redirect(302, '/login'); 
    }

    try {

        const docRef = adminFirestore.collection('users').doc(userID);
        const doc = await docRef.get();

        if (doc.exists) {
            return {
                profile: doc.data()
            };
        }

    } catch (error) {
        console.error("Errore nel recupero dati utente:", error);
    }

    return { profile: null };
};
