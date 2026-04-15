import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

if (!getApps().length) {
    const adminKey = JSON.parse(process.env.FIREBASE_ADMIN_KEY!);
    initializeApp({ credential: cert(adminKey) });
}

const db = getFirestore();
const BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
const EVENT_ID = 'beta-test';
const EVENT_DATE = '2026-04-15'; // data fittizia per i test (oggi)

// ── Slot di test ─────────────────────────────────────────────────────────────
// [ora, minuti] — orari fittizi, puoi cambiarli liberamente
const SLOT_DEFINITIONS: [number, number][] = [
    [10, 0],
    [10, 15],
    [10, 30],
    [10, 45],
    [11, 0],
    [11, 15],
    [11, 30],
    [11, 45],
    [12, 0],
    [12, 15],
    [12, 30],
    [12, 45],
];
const SLOT_DURATION_MIN = 10;

// ── Beta tester ───────────────────────────────────────────────────────────────
const BETA_TESTERS: { name: string; email: string }[] = [
    { name: 'Moreno Frigoturco',    email: 'frigoturcomoreno@gmail.com' },
    { name: 'Giorgio Basile',       email: 'giorgiobasile631@gmail.com' },
    { name: 'Vittorio Terreran',    email: 'vittorio.terreran@gmail.com' },
    { name: 'Lorenzo Da Costa',     email: 'lorenzo.d.costa04@gmail.com' },
    { name: 'Danxi Dan',            email: 'danxivdan@gmail.com' },
    { name: 'Michele Scarpa',       email: 'scarpa.michele.90@gmail.com' },
    { name: 'Davide Carraretto',    email: 'carrarettodavide99@gmail.com' },
    { name: 'Matteo Scarpa',        email: 'matteo.scarpa@fundor333.com' },
    { name: 'Alessandro Gigliarano',email: 'alessandro.gigliarano76@gmail.com' },
    { name: 'Andrea AV',            email: 'andrea.av23work@gmail.com' },
    { name: 'Andrea Della Porta',   email: 'dellaporta.andrea01@gmail.com' },
    { name: 'Alberto Pesce',        email: 'alberto.pesce98@gmail.com' },
];

function makeIsoDate(hour: number, minute: number): string {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${EVENT_DATE}T${hh}:${mm}:00+02:00`;
}

async function seed() {
    console.log(`\n🧪 Seed Beta Test — ${EVENT_ID}\n`);

    // Pulizia slot esistenti
    const existingSlots = await db.collection('slots').where('eventId', '==', EVENT_ID).get();
    if (!existingSlots.empty) {
        const batch = db.batch();
        existingSlots.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑  Eliminati ${existingSlots.size} slot esistenti`);
    }

    // Crea slot
    const slotBatch = db.batch();
    for (const [hour, minute] of SLOT_DEFINITIONS) {
        const startTime = makeIsoDate(hour, minute);
        const endDate = new Date(startTime);
        endDate.setUTCMinutes(endDate.getUTCMinutes() + SLOT_DURATION_MIN);
        const ref = db.collection('slots').doc();
        slotBatch.set(ref, {
            id: uuidv4(),
            eventId: EVENT_ID,
            startTime,
            endTime: endDate.toISOString(),
            status: 'AVAILABLE',
            speakerUid: null,
            speakerName: null,
            bookedAt: null,
            createdAt: new Date().toISOString()
        });
    }
    await slotBatch.commit();
    console.log(`✅ Creati ${SLOT_DEFINITIONS.length} slot`);

    // Pulizia speaker esistenti
    const existingSpeakers = await db.collection('speakers').where('eventId', '==', EVENT_ID).get();
    if (!existingSpeakers.empty) {
        const batch = db.batch();
        existingSpeakers.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑  Eliminati ${existingSpeakers.size} speaker esistenti`);
    }

    // Crea speaker
    const speakerBatch = db.batch();
    const links: { name: string; link: string }[] = [];

    for (const tester of BETA_TESTERS) {
        const token = uuidv4();
        const ref = db.collection('speakers').doc();
        speakerBatch.set(ref, {
            name: tester.name,
            email: tester.email,
            talk: null,
            token,
            eventId: EVENT_ID,
            preferredSlots: [],
            notes: '',
            status: 'pending',
            activatedAt: null,
            createdAt: new Date().toISOString()
        });
        links.push({ name: tester.name, link: `${BASE_URL}/${EVENT_ID}?token=${token}` });
    }

    await speakerBatch.commit();
    console.log(`✅ Creati ${BETA_TESTERS.length} beta tester\n`);

    console.log('📋 LINK DA INVIARE:\n');
    links.forEach(({ name, link }) => {
        console.log(`  ${name.padEnd(30)} ${link}`);
    });
    console.log('\n✨ Seed completato!\n');
}

seed().catch(console.error);
