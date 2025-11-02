import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
    const userIsAdmin = locals.isAdmin?? false; // Se locals non è popolato, l'utente non è Admin
    const currentPath = url.pathname;

    const targetAdminPath = '/app/admin';
    const targetHomePath = '/app/home';

    if (userIsAdmin) {
        if (!currentPath.startsWith(targetAdminPath)) {
            // Impedisce il reindirizzamento se l'utente è già su /app/admin/*
            return redirect(307, targetAdminPath); 
        }
    } else {
        if (!currentPath.startsWith(targetHomePath)) {
            return redirect(307, targetHomePath);
        }
    }
    
    return {}; 
};
