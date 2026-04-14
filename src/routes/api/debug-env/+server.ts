import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';

/**
 * Debug endpoint — returns only which env vars are SET (true/false), never their values.
 * Remove this route before going to production with sensitive data.
 */
export function GET() {
  return json({
    public: {
      PUBLIC_FIREBASE_ADMIN_KEY:       !!publicEnv.PUBLIC_FIREBASE_ADMIN_KEY,
      PUBLIC_FIREBASE_AUTH_DOMAIN:     !!publicEnv.PUBLIC_FIREBASE_AUTH_DOMAIN,
      PUBLIC_FIREBASE_PROJECT_ID:      !!publicEnv.PUBLIC_FIREBASE_PROJECT_ID,
      PUBLIC_FIRESTORE_STORAGEBUCKET:  !!publicEnv.PUBLIC_FIRESTORE_STORAGEBUCKET,
      PUBLIC_FIRESTORE_MESSAGINGSENDERID: !!publicEnv.PUBLIC_FIRESTORE_MESSAGINGSENDERID,
      PUBLIC_FIRESTORE_APPID:          !!publicEnv.PUBLIC_FIRESTORE_APPID,
      PUBLIC_FIRESTORE_MEASUREMENTID:  !!publicEnv.PUBLIC_FIRESTORE_MEASUREMENTID,
      PUBLIC_CLOUD_MESSAGING_KEY:      !!publicEnv.PUBLIC_CLOUD_MESSAGING_KEY,
    },
    private: {
      FIREBASE_ADMIN_KEY:  !!privateEnv.FIREBASE_ADMIN_KEY,
      ADMIN_PASSWORD:      !!privateEnv.ADMIN_PASSWORD,
      ADMIN_EMAILS_LIST:   !!privateEnv.ADMIN_EMAILS_LIST,
      BASE_URL:            !!privateEnv.BASE_URL,
    }
  });
}
