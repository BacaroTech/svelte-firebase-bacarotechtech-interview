# MVP Interview Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare la webapp di prenotazione interviste a MVP funzionante entro giovedì 16 aprile — speaker accedono via link con token, admin si autentica con password da `.env`.

**Architecture:** Rimosso Firebase Auth completamente — admin usa cookie server-side firmato con hash della password da env, speaker usano token UUID nei link condivisibili. Firestore resta per i dati. Due eventi separati su path `/azure-vicenza` e `/gdg-pisa`.

**Tech Stack:** SvelteKit 5 (runes), Firebase Firestore + Admin SDK, TailwindCSS 4, Vercel adapter, tsx (seed script)

**Spec di riferimento:** `docs/superpowers/specs/2026-04-13-mvp-interview-booking-design.md`

---

## File Map

### Da modificare
| File | Cambiamento |
|---|---|
| `src/app.d.ts` | Rimuovi campi Firebase Auth da Locals |
| `src/hooks.server.ts` | Rimuovi Firebase Auth, aggiungi admin cookie check |
| `src/lib/type/slots.d.ts` | Aggiungi stati DONE/PROBLEMA/ANNULLATO, aggiungi tipo Speaker |
| `src/routes/api/slots/+server.ts` | Aggiungi filtro `?eventId` alla GET |
| `src/routes/api/slots/book/+server.ts` | Accetta `token` invece di session cookie |
| `src/routes/api/speaker/+server.ts` | POST crea speaker con token UUID generato |
| `.env.example` | Aggiungi ADMIN_PASSWORD, PUBLIC_BASE_URL |

### Da creare
| File | Responsabilità |
|---|---|
| `src/lib/config/events.ts` | Mappa eventId → nome evento, data |
| `src/routes/admin/+layout.server.ts` | Protegge tutte le route `/admin/*` |
| `src/routes/admin/+layout.svelte` | Navigazione tra eventi admin |
| `src/routes/admin/login/+page.svelte` | Form password admin |
| `src/routes/admin/login/+page.server.ts` | Action: verifica password, imposta cookie |
| `src/routes/admin/[eventId]/+page.server.ts` | Carica slots + speakers per l'evento |
| `src/routes/admin/[eventId]/+page.svelte` | Dashboard admin: calendario, lista speaker, form aggiungi |
| `src/routes/api/slots/[id]/+server.ts` | PATCH: aggiorna status slot |
| `src/routes/api/speaker/[token]/+server.ts` | GET speaker by token |
| `src/routes/[eventId]/+page.server.ts` | Carica speaker by token + slots evento |
| `src/routes/[eventId]/+page.svelte` | Pagina prenotazione speaker (pubblica) |
| `scripts/seed-azure-vicenza.ts` | Seed Firestore: slot + speaker Azure Vicenza |

---

## Task 1: Foundation — Tipi, Env, App.d.ts

**Files:**
- Modify: `src/lib/type/slots.d.ts`
- Modify: `src/app.d.ts`
- Modify: `.env.example`

- [ ] **Step 1.1: Aggiorna i tipi**

Sostituisci il contenuto di `src/lib/type/slots.d.ts`:

```ts
export interface SpeakerDetails {
    uid: string;
    name: string;
}

export interface InterviewSlot {
    docId: string;
    id: string;
    eventId: string;
    startTime: string;
    endTime: string;
    status: 'AVAILABLE' | 'BOOKED' | 'DONE' | 'PROBLEMA' | 'ANNULLATO';
    speakerUid: string | null;   // docId Firestore dello speaker prenotato
    speakerName: string | null;
    bookedAt: string | null;
}

export interface Speaker {
    docId: string;
    name: string;
    email: string | null;
    talk: string | null;
    token: string;               // UUID v4 — usato nei link condivisibili
    eventId: string;
    preferredSlots: string[];    // docId degli slot preferiti (pre-dichiarati)
    notes: string;
    status: 'pending' | 'booked';
}

export interface UserState {
    loggedin: boolean;
    email?: string;
}
```

- [ ] **Step 1.2: Aggiorna App.Locals**

Sostituisci il contenuto di `src/app.d.ts`:

```ts
declare global {
    namespace App {
        interface Locals {
            isAdmin: boolean;
        }
    }
}

export {};
```

- [ ] **Step 1.3: Aggiorna .env.example**

Aggiungi in fondo a `.env.example`:

```
ADMIN_PASSWORD="cambia-questa-password"
PUBLIC_BASE_URL="http://localhost:5173"
```

- [ ] **Step 1.4: Aggiungi le variabili nel tuo .env locale**

Nel file `.env` (non versionato), aggiungi:
```
ADMIN_PASSWORD="la-tua-password-segreta"
PUBLIC_BASE_URL="http://localhost:5173"
```

- [ ] **Step 1.5: Verifica che il progetto compili**

```bash
npm run check
```

Atteso: nessun errore TypeScript. Se ci sono errori sul tipo `Locals` (es. `userID` usato in altri file), continuare — verranno risolti nei task successivi.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/type/slots.d.ts src/app.d.ts .env.example
git commit -m "feat: update types for MVP (new slot statuses, Speaker type, simplified Locals)"
```

---

## Task 2: Admin Auth — hooks.server.ts + Login Page

**Files:**
- Modify: `src/hooks.server.ts`
- Create: `src/routes/admin/login/+page.server.ts`
- Create: `src/routes/admin/login/+page.svelte`

- [ ] **Step 2.1: Sostituisci hooks.server.ts**

```ts
// src/hooks.server.ts
import { createHash } from 'crypto';
import { ADMIN_PASSWORD } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

export const handle = (async ({ event, resolve }) => {
    if (event.url.pathname.startsWith('/.well-known/appspecific/com.chrome.devtools')) {
        return new Response(null, { status: 204 });
    }

    const adminCookie = event.cookies.get('__admin_session');
    const expectedHash = ADMIN_PASSWORD ? hashPassword(ADMIN_PASSWORD) : null;
    event.locals.isAdmin = !!(adminCookie && expectedHash && adminCookie === expectedHash);

    return resolve(event);
}) satisfies Handle;
```

- [ ] **Step 2.2: Crea l'action del login admin**

Crea `src/routes/admin/login/+page.server.ts`:

```ts
import { createHash } from 'crypto';
import { ADMIN_PASSWORD } from '$env/static/private';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password') as string;

        if (!password || password !== ADMIN_PASSWORD) {
            return fail(401, { error: 'Password non valida' });
        }

        const hash = createHash('sha256').update(password).digest('hex');
        cookies.set('__admin_session', hash, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24
        });

        redirect(302, '/admin/azure-vicenza');
    }
};
```

- [ ] **Step 2.3: Crea la pagina di login**

Crea `src/routes/admin/login/+page.svelte`:

```svelte
<script lang="ts">
  import type { ActionData } from './$types';

  const { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Bacarotech Admin</h1>
    <p class="text-sm text-gray-500 mb-6">Accesso riservato</p>

    <form method="POST" class="space-y-4">
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {#if form?.error}
        <p class="text-sm text-red-600">{form.error}</p>
      {/if}

      <button
        type="submit"
        class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Accedi
      </button>
    </form>
  </div>
</div>
```

- [ ] **Step 2.4: Verifica il login manualmente**

```bash
npm run dev
```

Vai su `http://localhost:5173/admin/login`, inserisci la password dal `.env`, verifica il redirect a `/admin/azure-vicenza` (404 per ora — il route non esiste ancora, ma il redirect deve avvenire).

- [ ] **Step 2.5: Commit**

```bash
git add src/hooks.server.ts src/routes/admin/login/
git commit -m "feat: replace Firebase Auth with password-based admin session"
```

---

## Task 3: Admin Layout + Protezione Route

**Files:**
- Create: `src/routes/admin/+layout.server.ts`
- Create: `src/routes/admin/+layout.svelte`

- [ ] **Step 3.1: Crea il layout server (protezione)**

Crea `src/routes/admin/+layout.server.ts`:

```ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
    if (!locals.isAdmin && url.pathname !== '/admin/login') {
        redirect(302, '/admin/login');
    }
    return {};
};
```

- [ ] **Step 3.2: Crea il layout con navigazione tra eventi**

Crea `src/routes/admin/+layout.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  const { children }: { children: Snippet } = $props();

  const events = [
    { id: 'azure-vicenza', label: 'Azure Vicenza', emoji: '☁️' },
    { id: 'gdg-pisa', label: 'GDG Pisa', emoji: '🐍' }
  ];
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <span class="font-bold text-gray-900">Bacarotech Admin</span>
    <nav class="flex gap-2">
      {#each events as event}
        <a
          href="/admin/{event.id}"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            {$page.params.eventId === event.id
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'}"
        >
          {event.emoji} {event.label}
        </a>
      {/each}
      <a
        href="/admin/login"
        class="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-600"
      >
        Logout
      </a>
    </nav>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-6">
    {@render children()}
  </main>
</div>
```

- [ ] **Step 3.3: Verifica la protezione**

Con `npm run dev` attivo, vai su `http://localhost:5173/admin/azure-vicenza` **senza essere loggato** (cancella i cookie o apri in incognito). Deve fare redirect a `/admin/login`.

- [ ] **Step 3.4: Commit**

```bash
git add src/routes/admin/+layout.server.ts src/routes/admin/+layout.svelte
git commit -m "feat: admin layout with event navigation and route protection"
```

---

## Task 4: Config eventi + Slots API aggiornata

**Files:**
- Create: `src/lib/config/events.ts`
- Modify: `src/routes/api/slots/+server.ts`
- Create: `src/routes/api/slots/[id]/+server.ts`

- [ ] **Step 4.1: Crea la config eventi**

Crea `src/lib/config/events.ts`:

```ts
export const VALID_EVENT_IDS = ['azure-vicenza', 'gdg-pisa'] as const;
export type EventId = typeof VALID_EVENT_IDS[number];

export const EVENT_CONFIG: Record<EventId, { name: string; date: string; dayLabel: string }> = {
    'azure-vicenza': {
        name: 'Azure Global Meetup Vicenza',
        date: '2026-04-17',
        dayLabel: 'venerdì 17 aprile'
    },
    'gdg-pisa': {
        name: 'GDG Pisa',
        date: '2026-04-18',
        dayLabel: 'sabato 18 aprile'
    }
};
```

- [ ] **Step 4.2: Aggiorna GET /api/slots per filtrare per eventId**

Modifica `src/routes/api/slots/+server.ts` — sostituisci solo la funzione `GET` e `readFirebaseSlot`:

```ts
async function readFirebaseSlot(eventId?: string) {
    try {
        let query: FirebaseFirestore.Query = adminFirestore.collection('slots');
        if (eventId) {
            query = query.where('eventId', '==', eventId);
        }
        const slotsSnapshot = await query.get();
        const slots = slotsSnapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
        return json(slots, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore durante la lettura degli slot: ' + e.message }, { status: 500 });
    }
}

export const GET: RequestHandler = async ({ url }) => {
    const eventId = url.searchParams.get('eventId') ?? undefined;
    return readFirebaseSlot(eventId);
};
```

- [ ] **Step 4.3: Verifica il filtro eventId via curl**

```bash
# Tutti gli slot
curl http://localhost:5173/api/slots

# Solo azure-vicenza (dopo il seed sarà popolato)
curl "http://localhost:5173/api/slots?eventId=azure-vicenza"
```

Atteso: array JSON (vuoto se Firestore è vuoto, array filtrato dopo il seed).

- [ ] **Step 4.4: Crea endpoint PATCH per aggiornare status slot**

Crea `src/routes/api/slots/[id]/+server.ts`:

```ts
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_STATUSES = ['AVAILABLE', 'BOOKED', 'DONE', 'PROBLEMA', 'ANNULLATO'] as const;

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = params;
    let body: { status?: string };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    if (!body.status || !VALID_STATUSES.includes(body.status as any)) {
        return json({ error: `Status non valido. Valori accettati: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    try {
        await db.collection('slots').doc(id).update({ status: body.status });
        return json({ message: 'Status aggiornato' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};
```

- [ ] **Step 4.5: Verifica PATCH (dopo aver ottenuto un docId da Firestore)**

```bash
# Sostituisci SLOT_DOC_ID con un ID reale dopo il seed
curl -X PATCH http://localhost:5173/api/slots/SLOT_DOC_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"DONE"}' \
  -b "__admin_session=COOKIE_VALUE"
```

Atteso: `{"message":"Status aggiornato"}` con status 200.

- [ ] **Step 4.6: Commit**

```bash
git add src/lib/config/events.ts src/routes/api/slots/+server.ts src/routes/api/slots/[id]/+server.ts
git commit -m "feat: add eventId filter to slots GET, add PATCH status endpoint, add event config"
```

---

## Task 5: Booking API — token-based

**Files:**
- Modify: `src/routes/api/slots/book/+server.ts`

- [ ] **Step 5.1: Riscrivi l'endpoint di booking per usare token**

Sostituisci il contenuto di `src/routes/api/slots/book/+server.ts`:

```ts
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    let body: { slotId?: string; token?: string };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    const { slotId, token } = body;

    if (!slotId || !token) {
        return json({ error: 'slotId e token sono richiesti' }, { status: 400 });
    }

    // Risolvi lo speaker dal token
    const speakerSnapshot = await db.collection('speakers')
        .where('token', '==', token)
        .limit(1)
        .get();

    if (speakerSnapshot.empty) {
        return json({ error: 'Token non valido' }, { status: 401 });
    }

    const speakerDoc = speakerSnapshot.docs[0];
    const speakerName: string = speakerDoc.data().name;
    const speakerDocId: string = speakerDoc.id;

    const slotRef = db.collection('slots').doc(slotId);

    try {
        await db.runTransaction(async (transaction) => {
            const slotDoc = await transaction.get(slotRef);

            if (!slotDoc.exists) {
                throw new Error('Lo slot non esiste');
            }

            if (slotDoc.data()!.status !== 'AVAILABLE') {
                throw new Error('Questo slot non è disponibile');
            }

            transaction.update(slotRef, {
                status: 'BOOKED',
                speakerUid: speakerDocId,
                speakerName,
                bookedAt: new Date().toISOString()
            });

            transaction.update(speakerDoc.ref, { status: 'booked' });
        });

        return json({ message: 'Slot prenotato con successo!' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 400 });
    }
};
```

- [ ] **Step 5.2: Verifica booking via curl (dopo seed)**

```bash
# TOKEN e SLOT_ID si ottengono dopo il seed
curl -X POST http://localhost:5173/api/slots/book \
  -H "Content-Type: application/json" \
  -d '{"slotId":"SLOT_DOC_ID","token":"SPEAKER_TOKEN"}'
```

Atteso: `{"message":"Slot prenotato con successo!"}` con status 200.

Secondo tentativo sullo stesso slot:
Atteso: status 400 con `{"error":"Errore: Questo slot non è disponibile"}`.

- [ ] **Step 5.3: Commit**

```bash
git add src/routes/api/slots/book/+server.ts
git commit -m "feat: booking API now uses speaker token instead of Firebase Auth session"
```

---

## Task 6: Speaker API — crea con token + GET by token

**Files:**
- Modify: `src/routes/api/speaker/+server.ts`
- Create: `src/routes/api/speaker/[token]/+server.ts`

- [ ] **Step 6.1: Aggiorna POST /api/speaker per creare speaker con token UUID**

Sostituisci il contenuto di `src/routes/api/speaker/+server.ts`:

```ts
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.isAdmin) {
        return json({ error: 'Non autorizzato' }, { status: 401 });
    }

    let body: {
        name?: string;
        email?: string;
        talk?: string;
        eventId?: string;
        notes?: string;
        preferredSlots?: string[];
    };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    if (!body.name || !body.eventId) {
        return json({ error: 'name e eventId sono richiesti' }, { status: 400 });
    }

    const token = uuidv4();

    try {
        const docRef = db.collection('speakers').doc();
        await docRef.set({
            name: body.name,
            email: body.email ?? null,
            talk: body.talk ?? null,
            token,
            eventId: body.eventId,
            preferredSlots: body.preferredSlots ?? [],
            notes: body.notes ?? '',
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        return json({ docId: docRef.id, token }, { status: 201 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};
```

- [ ] **Step 6.2: Crea GET /api/speaker/[token]**

Crea `src/routes/api/speaker/[token]/+server.ts`:

```ts
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { token } = params;

    try {
        const snapshot = await db.collection('speakers')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return json({ error: 'Speaker non trovato' }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        return json({ ...doc.data(), docId: doc.id }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 500 });
    }
};
```

- [ ] **Step 6.3: Verifica creazione speaker via curl**

```bash
curl -X POST http://localhost:5173/api/speaker \
  -H "Content-Type: application/json" \
  -b "__admin_session=COOKIE_VALUE" \
  -d '{"name":"Mario Rossi","email":"mario@test.it","talk":"Il futuro di Azure","eventId":"azure-vicenza","notes":"Preferisce mattina"}'
```

Atteso: `{"docId":"...","token":"uuid-generato"}` con status 201.

```bash
# Recupera lo speaker con il token ricevuto
curl http://localhost:5173/api/speaker/UUID-GENERATO
```

Atteso: oggetto speaker con tutti i campi.

- [ ] **Step 6.4: Commit**

```bash
git add src/routes/api/speaker/+server.ts src/routes/api/speaker/[token]/+server.ts
git commit -m "feat: speaker API creates with UUID token, GET by token endpoint"
```

---

## Task 7: Pagina Prenotazione Speaker (pubblica)

**Files:**
- Create: `src/routes/[eventId]/+page.server.ts`
- Create: `src/routes/[eventId]/+page.svelte`

- [ ] **Step 7.1: Crea il server load**

Crea `src/routes/[eventId]/+page.server.ts`:

```ts
import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import { VALID_EVENT_IDS, EVENT_CONFIG } from '$lib/config/events';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { InterviewSlot, Speaker } from '$lib/type/slots';

export const load: PageServerLoad = async ({ params, url }) => {
    const { eventId } = params;

    if (!VALID_EVENT_IDS.includes(eventId as any)) {
        error(404, 'Evento non trovato');
    }

    const token = url.searchParams.get('token');

    const slotsSnapshot = await adminFirestore
        .collection('slots')
        .where('eventId', '==', eventId)
        .get();

    const slots: InterviewSlot[] = slotsSnapshot.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const eventConfig = EVENT_CONFIG[eventId as keyof typeof EVENT_CONFIG];

    if (!token) {
        return { speaker: null, slots, eventId, eventConfig, tokenInvalid: false };
    }

    const speakerSnapshot = await adminFirestore
        .collection('speakers')
        .where('token', '==', token)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();

    if (speakerSnapshot.empty) {
        return { speaker: null, slots, eventId, eventConfig, tokenInvalid: true };
    }

    const speakerDoc = speakerSnapshot.docs[0];
    const speaker = { ...speakerDoc.data(), docId: speakerDoc.id } as Speaker;

    return { speaker, slots, eventId, eventConfig, tokenInvalid: false };
};
```

- [ ] **Step 7.2: Crea la pagina prenotazione**

Crea `src/routes/[eventId]/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import type { InterviewSlot } from '$lib/type/slots';

  const { data }: { data: PageData } = $props();

  let selectedSlot = $state<InterviewSlot | null>(null);
  let view = $state<'slots' | 'confirm' | 'confirmed' | 'error' | 'form'>(
    data.tokenInvalid ? 'error' : data.speaker ? 'slots' : 'form'
  );
  let guestName = $state('');
  let guestEmail = $state('');
  let bookingError = $state('');
  let isBooking = $state(false);

  // Slot già prenotato dal questo speaker
  const myBookedSlot = $derived(
    data.speaker
      ? data.slots.find(s => s.speakerUid === data.speaker!.docId) ?? null
      : null
  );

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function isPreferred(slot: InterviewSlot) {
    return data.speaker?.preferredSlots?.includes(slot.docId) ?? false;
  }

  async function book() {
    if (!selectedSlot) return;
    isBooking = true;
    bookingError = '';

    const token = new URLSearchParams(window.location.search).get('token') ?? '';

    const res = await fetch('/api/slots/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: selectedSlot.docId, token })
    });

    if (res.ok) {
      view = 'confirmed';
    } else {
      const err = await res.json();
      bookingError = err.error ?? 'Errore durante la prenotazione';
    }
    isBooking = false;
  }
</script>

<div class="min-h-screen bg-gray-50 px-4 py-6 max-w-lg mx-auto">

  <!-- ERROR: token non valido -->
  {#if view === 'error'}
    <div class="bg-white rounded-xl shadow p-6 text-center">
      <p class="text-4xl mb-3">😕</p>
      <h1 class="text-lg font-bold text-gray-900 mb-2">Link non valido</h1>
      <p class="text-gray-500 text-sm">
        Questo link non è più valido o è scaduto.<br />
        Contatta Michele su Telegram per ricevere il tuo link personale.
      </p>
    </div>

  <!-- CONFIRMED: prenotazione effettuata -->
  {:else if view === 'confirmed'}
    <div class="bg-white rounded-xl shadow p-6 text-center">
      <p class="text-4xl mb-3">✅</p>
      <h1 class="text-lg font-bold text-gray-900 mb-1">Prenotato!</h1>
      {#if selectedSlot}
        <p class="text-indigo-600 font-semibold text-xl mb-2">
          {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
        </p>
      {/if}
      <p class="text-gray-500 text-sm">
        {data.eventConfig.dayLabel} — ci vediamo lì! 🎤
      </p>
    </div>

  <!-- FORM: nessun token, inserisci nome -->
  {:else if view === 'form'}
    <div class="bg-white rounded-xl shadow p-6">
      <h1 class="text-lg font-bold text-gray-900 mb-1">{data.eventConfig.name}</h1>
      <p class="text-sm text-gray-500 mb-4">{data.eventConfig.dayLabel}</p>
      <p class="text-sm text-gray-700 mb-4">Inserisci il tuo nome per vedere gli slot disponibili.</p>
      <div class="space-y-3">
        <input
          type="text"
          placeholder="Il tuo nome *"
          bind:value={guestName}
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email (opzionale)"
          bind:value={guestEmail}
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          disabled={!guestName.trim()}
          onclick={() => { if (guestName.trim()) view = 'slots'; }}
          class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Continua
        </button>
      </div>
    </div>

  <!-- SLOTS: lista slot da prenotare -->
  {:else if view === 'slots'}
    <div class="space-y-4">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{data.eventConfig.dayLabel}</p>
        <h1 class="text-lg font-bold text-gray-900">{data.eventConfig.name}</h1>
        {#if data.speaker}
          <p class="text-sm text-gray-600 mt-1">Ciao <strong>{data.speaker.name}</strong> 👋</p>
          {#if data.speaker.talk}
            <p class="text-xs text-gray-400 mt-0.5">"{data.speaker.talk}"</p>
          {/if}
        {:else}
          <p class="text-sm text-gray-600 mt-1">Ciao <strong>{guestName}</strong> 👋</p>
        {/if}
      </div>

      <!-- Già prenotato -->
      {#if myBookedSlot}
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p class="text-green-700 font-semibold">
            ✅ Sei già prenotato per le {formatTime(myBookedSlot.startTime)}
          </p>
        </div>
      {/if}

      <!-- Lista slot -->
      <div class="space-y-2">
        {#each data.slots as slot (slot.docId)}
          {@const preferred = isPreferred(slot)}
          {@const available = slot.status === 'AVAILABLE'}
          {@const selected = selectedSlot?.docId === slot.docId}

          <button
            disabled={!available}
            onclick={() => { selectedSlot = available ? slot : null; }}
            class="w-full text-left rounded-xl border p-4 transition-all
              {selected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300'
                : available
                  ? preferred
                    ? 'border-green-400 bg-green-50 hover:bg-green-100'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-gray-900">
                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full
                {available
                  ? preferred ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  : 'bg-gray-200 text-gray-400'}">
                {available ? (preferred ? '★ Preferenza' : 'Libero') : 'Occupato'}
              </span>
            </div>
          </button>
        {/each}
      </div>

      <!-- CTA conferma -->
      {#if selectedSlot}
        <div class="bg-white rounded-xl shadow p-4 sticky bottom-4">
          {#if bookingError}
            <p class="text-sm text-red-600 mb-2">{bookingError}</p>
          {/if}
          <button
            onclick={book}
            disabled={isBooking}
            class="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isBooking ? 'Prenotazione in corso...' : `Conferma ${formatTime(selectedSlot.startTime)}`}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
```

- [ ] **Step 7.3: Verifica la pagina speaker in browser**

Con il dev server attivo, dopo il seed (Task 9):
- Vai su `http://localhost:5173/azure-vicenza?token=TOKEN_DI_UN_RELATORE`
- Verifica: nome, talk, slot evidenziato come preferenza se applicabile
- Seleziona uno slot disponibile → appare il pulsante di conferma
- Premi conferma → schermata di successo

- [ ] **Step 7.4: Commit**

```bash
git add src/routes/[eventId]/
git commit -m "feat: public speaker booking page with token-based identification"
```

---

## Task 8: Dashboard Admin

**Files:**
- Create: `src/routes/admin/[eventId]/+page.server.ts`
- Create: `src/routes/admin/[eventId]/+page.svelte`

- [ ] **Step 8.1: Crea il server load della dashboard**

Crea `src/routes/admin/[eventId]/+page.server.ts`:

```ts
import { adminFirestore } from '$lib/firebase/firebase-admin.server';
import { VALID_EVENT_IDS, EVENT_CONFIG } from '$lib/config/events';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { InterviewSlot, Speaker } from '$lib/type/slots';

export const load: PageServerLoad = async ({ params }) => {
    const { eventId } = params;

    if (!VALID_EVENT_IDS.includes(eventId as any)) {
        error(404, 'Evento non trovato');
    }

    const [slotsSnap, speakersSnap] = await Promise.all([
        adminFirestore.collection('slots').where('eventId', '==', eventId).get(),
        adminFirestore.collection('speakers').where('eventId', '==', eventId).get()
    ]);

    const slots: InterviewSlot[] = slotsSnap.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const speakers: Speaker[] = speakersSnap.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as Speaker));

    const eventConfig = EVENT_CONFIG[eventId as keyof typeof EVENT_CONFIG];

    return { slots, speakers, eventId, eventConfig };
};
```

- [ ] **Step 8.2: Crea la dashboard admin**

Crea `src/routes/admin/[eventId]/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import type { InterviewSlot, Speaker } from '$lib/type/slots';
  import { PUBLIC_BASE_URL } from '$env/static/public';

  const { data }: { data: PageData } = $props();

  let slots = $state(data.slots);
  let speakers = $state(data.speakers);
  let showAddForm = $state(false);

  // Form aggiungi speaker
  let newName = $state('');
  let newEmail = $state('');
  let newTalk = $state('');
  let newNotes = $state('');
  let newLink = $state('');
  let addError = $state('');
  let isAdding = $state(false);

  const STATUS_OPTIONS = ['AVAILABLE', 'BOOKED', 'DONE', 'PROBLEMA', 'ANNULLATO'] as const;

  const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    BOOKED: 'bg-blue-100 text-blue-700',
    DONE: 'bg-gray-100 text-gray-500',
    PROBLEMA: 'bg-red-100 text-red-700',
    ANNULLATO: 'bg-gray-100 text-gray-400 line-through'
  };

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function speakerForSlot(slot: InterviewSlot): Speaker | undefined {
    return speakers.find(s => s.docId === slot.speakerUid);
  }

  function linkForSpeaker(speaker: Speaker): string {
    return `${PUBLIC_BASE_URL}/${data.eventId}?token=${speaker.token}`;
  }

  async function copyLink(speaker: Speaker) {
    await navigator.clipboard.writeText(linkForSpeaker(speaker));
  }

  async function updateSlotStatus(slotId: string, status: string) {
    const res = await fetch(`/api/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      slots = slots.map(s => s.docId === slotId ? { ...s, status: status as any } : s);
    }
  }

  async function addSpeaker() {
    if (!newName.trim()) return;
    isAdding = true;
    addError = '';
    newLink = '';

    const res = await fetch('/api/speaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        email: newEmail.trim() || null,
        talk: newTalk.trim() || null,
        notes: newNotes.trim(),
        eventId: data.eventId
      })
    });

    if (res.ok) {
      const { token, docId } = await res.json();
      const newSpeaker: Speaker = {
        docId,
        name: newName.trim(),
        email: newEmail.trim() || null,
        talk: newTalk.trim() || null,
        token,
        eventId: data.eventId,
        preferredSlots: [],
        notes: newNotes.trim(),
        status: 'pending'
      };
      speakers = [...speakers, newSpeaker];
      newLink = linkForSpeaker(newSpeaker);
      newName = ''; newEmail = ''; newTalk = ''; newNotes = '';
    } else {
      const err = await res.json();
      addError = err.error ?? 'Errore';
    }
    isAdding = false;
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">{data.eventConfig.name}</h1>
    <p class="text-sm text-gray-500">{data.eventConfig.dayLabel}</p>
  </div>

  <!-- SLOT TIMELINE -->
  <section class="bg-white rounded-xl shadow p-4">
    <h2 class="text-base font-semibold text-gray-900 mb-3">Slot interviste</h2>
    <div class="space-y-2">
      {#each slots as slot (slot.docId)}
        {@const speaker = speakerForSlot(slot)}
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
          <span class="text-sm font-mono text-gray-700 min-w-28">
            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
          </span>
          <span class="text-sm text-gray-600 flex-1">
            {speaker?.name ?? '—'}
          </span>
          <select
            value={slot.status}
            onchange={(e) => updateSlotStatus(slot.docId, (e.target as HTMLSelectElement).value)}
            class="text-xs rounded-md border border-gray-200 px-2 py-1 {STATUS_COLORS[slot.status] ?? ''}"
          >
            {#each STATUS_OPTIONS as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
        </div>
      {/each}
    </div>
  </section>

  <!-- LISTA SPEAKER CON LINK -->
  <section class="bg-white rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-gray-900">Speaker</h2>
      <button
        onclick={() => showAddForm = !showAddForm}
        class="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
      >
        {showAddForm ? 'Chiudi' : '+ Aggiungi speaker'}
      </button>
    </div>

    <!-- Form aggiungi speaker -->
    {#if showAddForm}
      <div class="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
        <input type="text" placeholder="Nome *" bind:value={newName}
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="email" placeholder="Email" bind:value={newEmail}
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="text" placeholder="Talk / argomento" bind:value={newTalk}
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="text" placeholder="Note (vincoli, disponibilità)" bind:value={newNotes}
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        {#if addError}
          <p class="text-sm text-red-600">{addError}</p>
        {/if}
        {#if newLink}
          <div class="bg-green-50 border border-green-200 rounded-md p-3">
            <p class="text-xs text-green-700 font-medium mb-1">Speaker aggiunto! Link:</p>
            <p class="text-xs text-green-800 break-all font-mono">{newLink}</p>
            <button
              onclick={() => navigator.clipboard.writeText(newLink)}
              class="mt-2 text-xs text-green-700 underline"
            >Copia link</button>
          </div>
        {/if}
        <button
          onclick={addSpeaker}
          disabled={isAdding || !newName.trim()}
          class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isAdding ? 'Creazione...' : 'Crea speaker e genera link'}
        </button>
      </div>
    {/if}

    <!-- Tabella speaker -->
    <div class="space-y-2">
      {#each speakers as speaker (speaker.docId)}
        {@const bookedSlot = slots.find(s => s.speakerUid === speaker.docId)}
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">{speaker.name}</p>
            {#if speaker.talk}
              <p class="text-xs text-gray-400 truncate">{speaker.talk}</p>
            {/if}
          </div>
          <span class="text-xs text-gray-500 min-w-16">
            {bookedSlot ? formatTime(bookedSlot.startTime) : '—'}
          </span>
          <button
            onclick={() => copyLink(speaker)}
            class="text-xs text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
          >
            📋 Copia link
          </button>
        </div>
      {/each}
      {#if speakers.length === 0}
        <p class="text-sm text-gray-400 text-center py-4">Nessuno speaker ancora. Aggiungine uno!</p>
      {/if}
    </div>
  </section>
</div>
```

- [ ] **Step 8.3: Verifica la dashboard in browser**

Con `npm run dev` attivo e dopo il seed:
- Vai su `http://localhost:5173/admin/azure-vicenza`
- Verifica: lista slot con orari, lista speaker con link copiabile
- Cambia lo status di uno slot dal dropdown → deve aggiornarsi senza reload
- Aggiungi un nuovo speaker → deve comparire il link generato

- [ ] **Step 8.4: Commit**

```bash
git add src/routes/admin/[eventId]/
git commit -m "feat: admin dashboard with slot status management and speaker link generation"
```

---

## Task 9: Seed Script Azure Vicenza

**Files:**
- Create: `scripts/seed-azure-vicenza.ts`
- Modify: `package.json` (aggiungi script seed)

- [ ] **Step 9.1: Installa tsx**

```bash
npm install -D tsx
```

- [ ] **Step 9.2: Crea il seed script**

Crea `scripts/seed-azure-vicenza.ts`:

```ts
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
const EVENT_DATE = new Date('2026-04-17T00:00:00.000Z'); // Venerdì 17 aprile 2026

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
    const d = new Date(EVENT_DATE);
    d.setUTCHours(hour, minute, 0, 0);
    return d.toISOString();
}

async function seed() {
    console.log(`\n🌱 Seed Azure Vicenza — ${EVENT_DATE.toDateString()}\n`);

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
```

- [ ] **Step 9.3: Aggiungi script seed in package.json**

Nel `package.json`, aggiungi dentro `"scripts"`:

```json
"seed:azure-vicenza": "tsx scripts/seed-azure-vicenza.ts"
```

- [ ] **Step 9.4: Esegui il seed**

```bash
npm run seed:azure-vicenza
```

Atteso output:
```
🌱 Seed Azure Vicenza — Fri Apr 17 2026

✅ Creati 10 slot

✅ Creati 11 speaker

📋 LINK DA INVIARE VIA EMAIL:

  Guido Imperatore                    http://localhost:5173/azure-vicenza?token=...
  Raffaele Colavecchi                 http://localhost:5173/azure-vicenza?token=...
  ...

✨ Seed completato!
```

- [ ] **Step 9.5: Verifica su Firestore Console**

Apri la Firebase Console → Firestore → collezione `slots`: deve avere 10 documenti con `eventId: "azure-vicenza"`.
Collezione `speakers`: deve avere 11 documenti. Guido, Carlo, Salvatore devono avere `preferredSlots` non vuoti.

- [ ] **Step 9.6: Verifica il flusso speaker end-to-end**

Copia uno dei token stampati dal seed e apri nel browser:
```
http://localhost:5173/azure-vicenza?token=TOKEN_COPIATO
```

Per Guido Imperatore: deve vedere gli slot mattina evidenziati come preferenza.
Per Carlo Ciciriello: stessa cosa, con la nota "Deve lasciare evento alle 14:30" visibile nelle note (le note sono in Firestore ma non necessariamente mostrate nella UI — verificare che la prenotazione funzioni comunque).

- [ ] **Step 9.7: Commit**

```bash
git add scripts/seed-azure-vicenza.ts package.json package-lock.json
git commit -m "feat: seed script for Azure Vicenza slots and speakers from stato.json"
```

---

## Task 10: Cleanup finale e redirect root

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/app/+layout.server.ts`

- [ ] **Step 10.1: Aggiorna la root page per redirect a admin**

Sostituisci `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/admin/azure-vicenza');
  });
</script>

<p class="text-center text-gray-400 mt-20 text-sm">Caricamento...</p>
```

- [ ] **Step 10.2: Aggiorna l'app layout per evitare redirect loop**

Aggiorna `src/routes/app/+layout.server.ts` in modo da non dipendere più da `locals.userID` (che non esiste più):

```ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
    // Le vecchie route /app/* non sono più in uso — redirect al nuovo admin
    redirect(302, '/admin/azure-vicenza');
};
```

- [ ] **Step 10.3: Verifica il deploy check**

```bash
npm run build
```

Atteso: build senza errori. Se ci sono errori TypeScript su file che usano ancora `locals.userID` o `locals.name` (es. `src/routes/api/slots/book/+server.ts` — già aggiornato), correggili.

- [ ] **Step 10.4: Test smoke completo**

Con `npm run dev`:

1. `http://localhost:5173` → redirect a `/admin/azure-vicenza` → redirect a `/admin/login`
2. Login con la password → arriva a `/admin/azure-vicenza`
3. Vede lista slot e speaker con link
4. Copia un link speaker, aprilo in incognito
5. Speaker vede i propri slot preferiti evidenziati
6. Prenota uno slot → schermata di conferma
7. Torna all'admin → lo slot appare come BOOKED con il nome dello speaker
8. Cambia status slot da dropdown → si aggiorna

- [ ] **Step 10.5: Commit finale**

```bash
git add src/routes/+page.svelte src/routes/app/+layout.server.ts
git commit -m "feat: redirect root to admin, update app layout for removed Firebase Auth"
```

---

## Checklist deploy su Vercel

Prima del primo deploy:

- [ ] Aggiungi su Vercel le variabili d'ambiente: `FIREBASE_ADMIN_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIRESTORE_STORAGEBUCKET`, `PUBLIC_FIRESTORE_MESSAGINGSENDERID`, `PUBLIC_FIRESTORE_APPID`, `ADMIN_PASSWORD`, `PUBLIC_BASE_URL` (con l'URL Vercel reale)
- [ ] Riesegui il seed con `PUBLIC_BASE_URL` impostato all'URL Vercel per ottenere i link definitivi da mandare via email
- [ ] Verifica che il build `npm run build` passi prima del push

---

## Fuori scope (MVP)

- GDG Pisa seed script (da duplicare quando arrivano i dati)
- Notifiche push FCM
- Cancel/rebook slot da parte dello speaker
- Ripristino Google Auth
