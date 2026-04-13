/**
 * inspect-firestore.ts
 * Legge e stampa tutti i documenti di slots e speakers da Firestore.
 * Utile per verificare il seed e debuggare lo stato del DB.
 *
 * Uso:
 *   npx tsx scripts/inspect-firestore.ts
 *   npx tsx scripts/inspect-firestore.ts --event azure-vicenza
 *   npx tsx scripts/inspect-firestore.ts --collection speakers
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

if (!getApps().length) {
  const rawKey = process.env.FIREBASE_ADMIN_KEY;
  if (!rawKey) {
    console.error('❌  FIREBASE_ADMIN_KEY non trovata in .env');
    process.exit(1);
  }
  try {
    const adminKey = JSON.parse(rawKey);
    initializeApp({ credential: cert(adminKey) });
    console.log(`🔥 Progetto Firebase: ${adminKey.project_id}\n`);
  } catch {
    console.error('❌  FIREBASE_ADMIN_KEY non è JSON valido');
    process.exit(1);
  }
}

const db = getFirestore();

// ── Argomenti CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const eventFilter = args.includes('--event') ? args[args.indexOf('--event') + 1] : null;
const collectionArg = args.includes('--collection') ? args[args.indexOf('--collection') + 1] : null;

// ── Utility ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function truncate(s: string | null | undefined, n = 30) {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function pad(s: string, n: number) {
  return s.padEnd(n);
}

// ── Stampa slots ──────────────────────────────────────────────────────────────
async function printSlots() {
  let query: FirebaseFirestore.Query = db.collection('slots').orderBy('startTime');
  if (eventFilter) query = query.where('eventId', '==', eventFilter);

  const snap = await query.get();
  console.log(`\n📅  SLOTS  (${snap.size} documenti${eventFilter ? ` — evento: ${eventFilter}` : ''})\n`);

  if (snap.empty) {
    console.log('   (nessun documento)\n');
    return;
  }

  const header = [
    pad('docId', 22),
    pad('eventId', 16),
    pad('start', 6),
    pad('end', 6),
    pad('status', 12),
    pad('speakerName', 22),
  ].join('  ');
  const divider = '─'.repeat(header.length);

  console.log(header);
  console.log(divider);
  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log([
      pad(doc.id.slice(0, 20), 22),
      pad(d.eventId ?? '—', 16),
      pad(fmtTime(d.startTime), 6),
      pad(fmtTime(d.endTime), 6),
      pad(d.status ?? '—', 12),
      pad(truncate(d.speakerName, 22), 22),
    ].join('  '));
  });
  console.log();
}

// ── Stampa speakers ───────────────────────────────────────────────────────────
async function printSpeakers() {
  let query: FirebaseFirestore.Query = db.collection('speakers').orderBy('name');
  if (eventFilter) query = query.where('eventId', '==', eventFilter);

  const snap = await query.get();
  console.log(`\n👤  SPEAKERS  (${snap.size} documenti${eventFilter ? ` — evento: ${eventFilter}` : ''})\n`);

  if (snap.empty) {
    console.log('   (nessun documento)\n');
    return;
  }

  const header = [
    pad('docId', 22),
    pad('name', 28),
    pad('eventId', 16),
    pad('status', 10),
    pad('token (primi 8 char)', 20),
    pad('preferredSlots', 6),
  ].join('  ');
  const divider = '─'.repeat(header.length);

  console.log(header);
  console.log(divider);
  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log([
      pad(doc.id.slice(0, 20), 22),
      pad(truncate(d.name, 28), 28),
      pad(d.eventId ?? '—', 16),
      pad(d.status ?? '—', 10),
      pad(d.token ? d.token.slice(0, 8) + '…' : '—', 20),
      pad(String((d.preferredSlots ?? []).length), 6),
    ].join('  '));
  });
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function inspect() {
  if (!collectionArg || collectionArg === 'slots') await printSlots();
  if (!collectionArg || collectionArg === 'speakers') await printSpeakers();
}

inspect().catch(err => {
  console.error('❌  Errore durante l\'ispezione:', err.message ?? err);
  process.exit(1);
});
