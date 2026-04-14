import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Reindirizziamo l'utente alla dashboard dell'evento principale
    redirect(302, '/admin/azure-vicenza');
};
