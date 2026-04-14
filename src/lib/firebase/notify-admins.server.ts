import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { getMessaging, type Message } from 'firebase-admin/messaging';

/**
 * Sends a push notification to all registered admin FCM tokens.
 * Never throws — notification failure must not block the API response.
 */
export async function notifyAdmins(title: string, body: string): Promise<void> {
  try {
    const snap = await db.collection('fcm_tokens')
      .where('role', '==', 'admin')
      .get();

    if (snap.empty) return;

    const tokens = snap.docs.map(d => d.id);
    const messages: Message[] = tokens.map(token => ({
      token,
      notification: { title, body },
      webpush: {
        notification: { title, body, icon: '/icons/icon-192x192.png' }
      },
      android: { priority: 'high' as const }
    }));

    const messaging = getMessaging();
    const result = await messaging.sendEach(messages);

    // Remove stale tokens
    const stale = result.responses
      .map((r, i) => ({ err: r.error, token: tokens[i] }))
      .filter(({ err }) =>
        err?.code === 'messaging/invalid-registration-token' ||
        err?.code === 'messaging/registration-token-not-registered'
      );

    if (stale.length > 0) {
      const batch = db.batch();
      stale.forEach(({ token }) => batch.delete(db.collection('fcm_tokens').doc(token)));
      await batch.commit();
    }
  } catch (err) {
    console.error('[notifyAdmins] failed silently:', err);
  }
}
