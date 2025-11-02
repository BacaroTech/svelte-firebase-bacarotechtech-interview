import { env } from '$env/dynamic/private';
import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseEnv = env.FIREBASE_ADMIN_KEY;
const serviceAccount = JSON.parse(env.FIREBASE_ADMIN_KEY);
let defaultApp;
if (!getApps().length) {

    defaultApp = initializeApp({
        credential: cert(serviceAccount),
    });
}

if (!defaultApp) {
  console.warn("Unknown default app");
}

export const adminAuth = getAuth();
export const adminFirestore = getFirestore();
