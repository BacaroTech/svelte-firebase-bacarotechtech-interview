import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Inizializza Firebase Admin
if (!getApps().length) {
    const adminKey = JSON.parse(process.env.FIREBASE_ADMIN_KEY!);
    initializeApp({ credential: cert(adminKey) });
}

const db = getFirestore();

const BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
const EVENT_ID = 'azure-vicenza';
const EVENT_DATE = '2026-04-17'; // Venerdì 17 aprile 2026 (ora locale italiana CEST = UTC+2)

// Leggi stato.json
const statoPath = resolve(process.cwd(), 'doc/stato.json');
const stato = JSON.parse(readFileSync(statoPath, 'utf-8'));

// Definizione slot: [ora, minuti, durata minuti]
const SLOT_DEFINITIONS = [
    // Blocco colazione (10:20–10:50, può sforare)
    [10, 20, 10],
    [10, 30, 10],
    [10, 40, 10],
    // Blocco mattina (12:30–13:20, può sforare)
    [12, 30, 10],
    [12, 40, 10],
    [12, 50, 10],
    [13,  0, 10],
    [13, 10, 10],
    // Blocco pomeriggio (14:50–15:40, può sforare)
    [14, 50, 10],
    [15,  0, 10],
    [15, 10, 10],
    [15, 20, 10],
    [15, 30, 10],
] as const;

const COLAZIONE_COUNT = 3;
const MORNING_COUNT = 5;

function makeIsoDate(hour: number, minute: number): string {
    // Ora locale italiana (CEST = UTC+2) — es. 12:30+02:00 = 10:30Z
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${EVENT_DATE}T${hh}:${mm}:00+02:00`;
}

async function seed() {
    console.log(`\n🌱 Seed Azure Vicenza — ${EVENT_DATE} (ora locale CEST)\n`);

    // Pulizia slot esistenti per questo evento
    const existingSlots = await db.collection('slots').where('eventId', '==', EVENT_ID).get();
    if (!existingSlots.empty) {
        const batch = db.batch();
        existingSlots.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑  Eliminati ${existingSlots.size} slot esistenti\n`);
    }

    // Crea i doc ref per gli slot (così abbiamo gli ID prima di scrivere)
    const slotRefs = SLOT_DEFINITIONS.map(() => db.collection('slots').doc());
    const morningSlotIds = slotRefs.slice(COLAZIONE_COUNT, COLAZIONE_COUNT + MORNING_COUNT).map(r => r.id);
    const afternoonSlotIds = slotRefs.slice(COLAZIONE_COUNT + MORNING_COUNT).map(r => r.id);

    // Scrivi gli slot in batch
    const slotBatch = db.batch();
    SLOT_DEFINITIONS.forEach(([hour, minute, duration], i) => {
        const startTime = makeIsoDate(hour, minute);
        const endDate = new Date(startTime);
        endDate.setUTCMinutes(endDate.getUTCMinutes() + duration);

        slotBatch.set(slotRefs[i], {
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
    });
    await slotBatch.commit();
    console.log(`✅ Creati ${SLOT_DEFINITIONS.length} slot\n`);

    // Pulizia speaker esistenti per questo evento
    const existingSpeakers = await db.collection('speakers').where('eventId', '==', EVENT_ID).get();
    if (!existingSpeakers.empty) {
        const batch = db.batch();
        existingSpeakers.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑  Eliminati ${existingSpeakers.size} speaker esistenti\n`);
    }

    // Costruisci mappa prenotazioni: nome → preferenza slot
    const prenotazioniMap: Record<string, { slot: string; note: string }> = {};
    stato.prenotazioni.forEach((p: { nome: string; slot: string; note: string }) => {
        prenotazioniMap[p.nome] = { slot: p.slot, note: p.note };
    });

    // Crea speaker
    const speakerBatch = db.batch();
    const links: { nome: string; link: string }[] = [];

    for (const partecipante of stato.partecipanti) {
        const nome: string = partecipante.nome;
        const email: string | null = partecipante.email;
        const token = uuidv4();
        const prenotazione = prenotazioniMap[nome];

        // Determina preferredSlots in base alla preferenza dichiarata
        let preferredSlots: string[] = [];
        let notes = '';

        if (prenotazione) {
            preferredSlots = prenotazione.slot === 'mattina' ? morningSlotIds : afternoonSlotIds;
            notes = prenotazione.note;
        }

        const isOptional = stato.opzionali.some((o: { nome: string }) => nome.startsWith(o.nome));

        const docRef = db.collection('speakers').doc();
        speakerBatch.set(docRef, {
            name: nome,
            email,
            talk: null,
            token,
            eventId: EVENT_ID,
            preferredSlots,
            notes,
            status: 'pending',
            optional: isOptional,
            createdAt: new Date().toISOString()
        });

        const link = `${BASE_URL}/${EVENT_ID}?token=${token}`;
        links.push({ nome, link });
    }

    await speakerBatch.commit();
    console.log(`✅ Creati ${stato.partecipanti.length} speaker\n`);

    // Output link
    console.log('📋 LINK DA INVIARE VIA EMAIL:\n');
    links.forEach(({ nome, link }) => {
        console.log(`  ${nome.padEnd(35)} ${link}`);
    });
    console.log('\n✨ Seed completato!\n');
}

seed().catch(console.error);
