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
    // Blocco mattina (12:30–13:30)
    [12, 30, 12],
    [12, 42, 12],
    [12, 54, 12],
    [13, 6, 12],
    [13, 18, 12],
    // Blocco pomeriggio (14:50–15:50)
    [14, 50, 12],
    [15, 2, 12],
    [15, 14, 12],
    [15, 26, 12],
    [15, 38, 12],
] as const;

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
    const morningSlotIds = slotRefs.slice(0, 5).map(r => r.id);
    const afternoonSlotIds = slotRefs.slice(5).map(r => r.id);

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
