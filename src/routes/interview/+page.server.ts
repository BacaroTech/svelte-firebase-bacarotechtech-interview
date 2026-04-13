import { adminFirestore } from '$lib/firebase/firebase-admin.server';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        // Public calendar view - no authentication required
        // Load any initial data if needed
        return {};
    } catch (error) {
        console.error("Errore nel caricamento dati:", error);
    }

    return {};
};
