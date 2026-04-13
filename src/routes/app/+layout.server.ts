import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
    // Le vecchie route /app/* non sono più in uso — redirect al nuovo admin
    redirect(302, '/admin/azure-vicenza');
};
