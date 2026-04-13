import { env } from '$env/dynamic/private';
import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseEnv = env.FIREBASE_ADMIN_KEY
  // Normalize typographic quotes that can appear when copy-pasting JSON into Vercel env vars
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"');
const serviceAccount = JSON.parse(firebaseEnv);
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
