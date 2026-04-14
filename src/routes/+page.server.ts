import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Come da doc/regole-rotte.md, la rotta di default è l'evento corrente
    redirect(302, '/azure-vicenza');
};