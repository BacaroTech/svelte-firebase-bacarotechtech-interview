# Speaker UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migliorare l'esperienza degli speaker nella pagina di prenotazione con: onboarding contestuale, info logistiche, branding Bacarotech, Add to Calendar, change request flow e notifiche FCM all'admin.

**Architecture:** Le modifiche UI sono concentrate in `[eventId]/+page.svelte`. Il change request flow aggiunge un nuovo endpoint API. Le notifiche FCM admin riutilizzano l'infrastruttura esistente (FCM token, service worker già generato) con l'aggiunta di un campo `role` per distinguere token admin da speaker.

**Tech Stack:** SvelteKit 5, Svelte 5 runes (`$state`, `$derived`, `$effect`), Firebase Admin SDK (Firestore transactions + Messaging), Tailwind CSS v4, Vercel serverless.

---

## File Map

| File | Operazione | Responsabilità |
|------|-----------|----------------|
| `src/routes/[eventId]/+page.svelte` | Modifica | UI onboarding, logistica, live indicator, Add to Calendar, change request UI |
| `src/routes/api/save-token/+server.ts` | Modifica | Accetta campo `role` e lo salva in Firestore |
| `src/lib/components/notification/InterviewNotification.svelte` | Modifica | Prop `role` passata al save-token endpoint |
| `src/lib/firebase/notify-admins.server.ts` | Crea | Helper: query fcm_tokens admin + invio FCM |
| `src/routes/api/slots/book/+server.ts` | Modifica | Chiama `notifyAdmins` dopo booking + messaggio race condition migliorato |
| `src/routes/api/slots/request-change/+server.ts` | Crea | Endpoint change request |
| `src/routes/admin/+layout.svelte` | Modifica | Aggiunge `<InterviewNotification role="admin" />` |

---

## Task 1 — UI Onboarding + Logistica + Branding + Live Indicator

**Files:**
- Modify: `src/routes/[eventId]/+page.svelte`

### Modifiche al `<script>` — nuove variabili di stato

- [ ] **Step 1.1: Aggiungere variabile `isLive` e `onboardingDismissed`**

Nel blocco `<script lang="ts">`, dopo `let isBooking = $state(false);` aggiungere:

```ts
let isLive = $state(false);
let onboardingDismissed = $state(
  typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('onboarding_dismissed') === '1'
    : false
);

function dismissOnboarding() {
  onboardingDismissed = true;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('onboarding_dismissed', '1');
  }
}
```

- [ ] **Step 1.2: Settare `isLive = true` nell'`$effect` di Firestore**

Modificare l'`$effect` esistente (righe 16-28) aggiungendo `isLive = true` al primo evento:

```ts
$effect(() => {
  if (!browser || !dbClient) return;
  const q = query(
    collection(dbClient, 'slots'),
    where('eventId', '==', data.eventId)
  );
  const unsubscribe = onSnapshot(q, snapshot => {
    isLive = true;  // ← aggiunto
    slots = snapshot.docs
      .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });
  return unsubscribe;
});
```

- [ ] **Step 1.3: Aggiungere funzione `buildGCalUrl`**

```ts
function buildGCalUrl(slot: InterviewSlot): string {
  const start = slot.startTime.replace(/[-:]/g, '').replace('.000Z', 'Z');
  const end   = slot.endTime.replace(/[-:]/g, '').replace('.000Z', 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Intervista Bacarotech — Global Azure Veneto 2026',
    dates: `${start}/${end}`,
    details: 'Chiacchierata free-style con Michele di Bacarotech. 5-7 minuti, senza copione.',
    location: 'Area divanetti, vicino alla reception — cerca la DJI Action su cavalletto'
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

- [ ] **Step 1.4: Migliorare il messaggio di errore race condition nella funzione `book()`**

Sostituire:
```ts
bookingError = err.error ?? 'Errore durante la prenotazione';
```
Con:
```ts
const msg: string = err.error ?? 'Errore durante la prenotazione';
bookingError = msg.includes('non è disponibile')
  ? 'Qualcuno ha appena prenotato questo slot 😅 Scegline un altro 👇'
  : msg;
```

### Modifiche allo snippet `slotRow` — label preferenza

- [ ] **Step 1.5: Cambiare badge "Preferenza" → "Disponibile" con tooltip**

Nello snippet `slotRow`, trovare la riga con il testo `preferred ? '★ Preferenza'` e sostituire:

```svelte
{isMe ? '✓ Il tuo slot' : available ? (preferred ? '★ Preferenza' : 'Libero') : (slot.speakerName ?? 'Occupato')}
```
Con:
```svelte
{isMe ? '✓ Il tuo slot' : available ? (preferred ? '★ Disponibile' : 'Libero') : (slot.speakerName ?? 'Occupato')}
```

E al bottone dello slot interattivo aggiungere il `title` attribute quando è preferred, trovando il `<button` e aggiungendo:
```svelte
title={preferred ? 'Slot che hai indicato disponibile via email' : undefined}
```

### Modifiche alla view `confirmed`

- [ ] **Step 1.6: Aggiungere card logistica e bottone Add to Calendar nella view `confirmed`**

Nella sezione `{:else if view === 'confirmed'}`, dopo il `<p class="text-gray-500 text-sm">` esistente, aggiungere:

```svelte
<!-- Add to calendar -->
{#if selectedSlot}
  <a
    href={buildGCalUrl(selectedSlot)}
    target="_blank"
    rel="noopener noreferrer"
    class="mt-4 inline-block rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
  >
    📅 Aggiungi al calendario
  </a>
{/if}

<!-- Info logistiche -->
<div class="mt-5 text-left rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
  <div>
    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">📍 Dove trovarmi</p>
    <p class="text-sm text-gray-700">Area divanetti vicino alla reception</p>
    <p class="text-xs text-gray-500">Cerca la DJI Action su cavalletto</p>
  </div>
  <div>
    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">📱 Imprevisti last-minute</p>
    <p class="text-sm text-gray-700">WhatsApp / Telegram: <span class="font-mono">@michele_scarpa · 348 348 2541</span></p>
  </div>
</div>
```

### Modifiche alla view `slots`

- [ ] **Step 1.7: Aggiungere banner onboarding contestuale**

All'inizio della colonna sinistra della view `slots` (dopo `<!-- Header -->`), aggiungere:

```svelte
<!-- Onboarding banner -->
{#if !onboardingDismissed && data.speaker}
  <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2">
    <span class="text-lg leading-none mt-0.5">🎤</span>
    <div class="flex-1 text-sm text-indigo-800">
      Prenota il tuo slot per la chiacchierata con Michele di Bacarotech —
      <strong>5-7 minuti, free-style</strong>.
      Gli slot in verde <strong>★</strong> sono quelli che hai indicato disponibili via email.
    </div>
    <button
      type="button"
      onclick={dismissOnboarding}
      class="text-indigo-400 hover:text-indigo-600 text-lg leading-none"
      aria-label="Chiudi"
    >✕</button>
  </div>
{/if}
```

- [ ] **Step 1.8: Aggiungere indicatore Live e hint Programma**

Subito dopo i `<p class="text-xs text-gray-400 px-1 mb-2">` della sezione Mattina (prima sezione slot interattiva), aggiungere l'indicatore live nel header della view `slots`:

Trovare il blocco header della view slots (`<div class="bg-white rounded-xl shadow p-4">`), e dopo la `<p class="text-sm text-gray-600 mt-1">Ciao...` aggiungere:

```svelte
{#if isLive}
  <p class="flex items-center gap-1 text-xs text-green-500 mt-1">
    <span class="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
    Aggiornamento in tempo reale
  </p>
{/if}
```

Poi, tra la sezione Colazione (o inizio lista slot) e il primo blocco di slot interattivi, aggiungere hint Programma **solo se non ancora selezionato uno slot**:

```svelte
{#if !selectedSlot && !myBookedSlot}
  <p class="text-xs text-gray-400 px-1">
    💡 Usa il tab <strong>Programma</strong> per vedere il tuo talk e scegliere uno slot che non si sovrapponga alla tua sessione.
  </p>
{/if}
```

- [ ] **Step 1.9: Aggiungere hint visibilità nomi speaker**

Dopo la lista degli slot pomeridiani interattivi (dopo l'ultimo `{/each}` degli slot), aggiungere:

```svelte
<p class="text-xs text-gray-400 px-1 mt-1">
  👥 I nomi degli altri speaker sono visibili: così potete organizzarvi autonomamente se avete esigenze di orario simili.
</p>
```

### Footer Bacarotech — snippet riutilizzabile

- [ ] **Step 1.10: Aggiungere snippet `bacaroFooter` e applicarlo su tutte le view**

Prima del markup HTML (`<div class="min-h-screen...`), aggiungere lo snippet:

```svelte
{#snippet bacaroFooter()}
  <div class="mt-8 border-t border-gray-100 pt-4 pb-6 text-center">
    <div class="flex items-center justify-center gap-1.5 mb-1">
      <img src={icon} alt="Bacarotech" class="h-4 w-auto opacity-60" />
      <span class="text-xs text-gray-400 font-medium">Bacarotech</span>
    </div>
    <p class="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
      Associazione culturale no-profit, gestita da volontari. Questa webapp usa strumenti gratuiti o a costo minimo.
      Alcune funzionalità (es. notifica email di conferma) non sono disponibili per contenere i costi.
    </p>
  </div>
{/snippet}
```

Aggiungere l'import dell'icona nel `<script>`:
```ts
import icon from '$lib/assets/icon.png';
```

Poi aggiungere `{@render bacaroFooter()}` in fondo a ognuna delle view: `error`, `confirmed`, `form`, e `slots` (fuori dal grid, alla fine del `<div class="min-h-screen...">`).

- [ ] **Step 1.11: Verificare TypeScript**

```bash
cd /path/to/worktree && npm run check
```
Atteso: 0 errori su `[eventId]/+page.svelte`.

- [ ] **Step 1.12: Commit**

```bash
git add src/routes/\[eventId\]/+page.svelte
git commit -m "feat: speaker UX — onboarding, logistica, live indicator, Add to Calendar, branding"
```

---

## Task 2 — FCM Admin: campo `role` + helper `notifyAdmins`

**Files:**
- Modify: `src/routes/api/save-token/+server.ts`
- Modify: `src/lib/components/notification/InterviewNotification.svelte`
- Create: `src/lib/firebase/notify-admins.server.ts`
- Modify: `src/routes/admin/+layout.svelte`

### 2.1 — Aggiornare `/api/save-token` per accettare `role`

- [ ] **Step 2.1: Modificare `save-token/+server.ts`**

Sostituire il contenuto con:

```ts
import { adminFirestore as adminDB } from '$lib/firebase/firebase-admin.server';
import { FieldValue } from 'firebase-admin/firestore';
import { error, json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { token, role } = body as { token?: string; role?: string };

    if (!token || typeof token !== 'string') {
      throw error(400, 'Token non valido o mancante');
    }

    const validRole = role === 'admin' ? 'admin' : 'speaker';

    const tokenRef = adminDB.collection('fcm_tokens').doc(token);
    await tokenRef.set({
      createdAt: FieldValue.serverTimestamp(),
      role: validRole,
    }, { merge: true });

    return json({ success: true, message: 'Token salvato con successo' });

  } catch (err) {
    console.error('Errore nel salvataggio del token:', err);
    throw error(500, 'Impossibile salvare il token');
  }
}
```

### 2.2 — Aggiornare `InterviewNotification.svelte` per prop `role`

- [ ] **Step 2.2: Aggiungere prop `role` e passarla al save-token**

Sostituire la riga `let fcmToken = $state('');` con il blocco props/state:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { messaging } from "$lib/firebase/firebase.client";
  import { getToken, onMessage } from "firebase/messaging";
  import { env } from "$env/dynamic/public";
  import { tooltip } from "../tools/tootlip";

  const { role = 'speaker' }: { role?: 'admin' | 'speaker' } = $props();

  let notificationPermission: NotificationPermission = $state("default");
  let fcmToken = $state("");
  let error: string | HTMLElement = $state("");
  // ... resto invariato
```

Nella funzione `saveTokenToServer`, aggiungere `role` al body:

```ts
async function saveTokenToServer(token: string) {
  try {
    const response = await fetch("/api/save-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, role }),
    });
    if (!response.ok) throw new Error("La richiesta al server è fallita");
    console.log("Token salvato correttamente sul server.");
  } catch (err) {
    console.error("Errore durante il salvataggio del token sul server:", err);
  }
}
```

### 2.3 — Creare helper `notify-admins.server.ts`

- [ ] **Step 2.3: Creare `src/lib/firebase/notify-admins.server.ts`**

```ts
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
```

### 2.4 — Aggiungere `InterviewNotification` all'admin layout

- [ ] **Step 2.4: Modificare `src/routes/admin/+layout.svelte`**

Aggiungere l'import e il componente nella header admin:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';
  import InterviewNotification from '$lib/components/notification/InterviewNotification.svelte';

  const { children }: { children: Snippet } = $props();

  const events = [
    { id: 'azure-vicenza', label: 'Azure Vicenza', emoji: '☁️' },
  ];
</script>

<div class="min-h-screen bg-gray-50 text-gray-600">
  <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <span class="font-bold text-gray-900">Bacarotech Admin</span>
    <nav class="flex gap-2 items-center">
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
        href="/admin/schedule"
        class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors
          {$page.url.pathname === '/admin/schedule'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'}"
      >
        📅 Programma
      </a>
      <InterviewNotification role="admin" />
      <a
        href="/admin/logout"
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

- [ ] **Step 2.5: Verificare TypeScript**

```bash
npm run check
```
Atteso: 0 errori nei file modificati.

- [ ] **Step 2.6: Commit**

```bash
git add src/routes/api/save-token/+server.ts \
        src/lib/components/notification/InterviewNotification.svelte \
        src/lib/firebase/notify-admins.server.ts \
        src/routes/admin/+layout.svelte
git commit -m "feat: FCM admin role — distinguish admin/speaker tokens, add notifyAdmins helper"
```

---

## Task 3 — Notifica admin al booking + messaggio race condition

**Files:**
- Modify: `src/routes/api/slots/book/+server.ts`

- [ ] **Step 3.1: Aggiungere import e chiamata `notifyAdmins` in `book/+server.ts`**

Sostituire il file completo con:

```ts
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notifyAdmins } from '$lib/firebase/notify-admins.server';

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

    let bookedStartTime = '';

    try {
        await db.runTransaction(async (transaction) => {
            const slotDoc = await transaction.get(slotRef);

            if (!slotDoc.exists) {
                throw new Error('Lo slot non esiste');
            }

            if (slotDoc.data()!.status !== 'AVAILABLE') {
                throw new Error('Questo slot non è disponibile');
            }

            bookedStartTime = slotDoc.data()!.startTime as string;

            transaction.update(slotRef, {
                status: 'BOOKED',
                speakerUid: speakerDocId,
                speakerName,
                bookedAt: new Date().toISOString()
            });

            transaction.update(speakerDoc.ref, { status: 'booked' });
        });

        // Notifica admin — fire and forget
        const hora = new Date(bookedStartTime).toLocaleTimeString('it-IT', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
        });
        await notifyAdmins(
            '🎤 Nuova prenotazione',
            `${speakerName} ha prenotato le ${hora}`
        );

        return json({ message: 'Slot prenotato con successo!' }, { status: 200 });
    } catch (e: any) {
        return json({ error: 'Errore: ' + e.message }, { status: 400 });
    }
};
```

- [ ] **Step 3.2: Verificare TypeScript**

```bash
npm run check
```

- [ ] **Step 3.3: Commit**

```bash
git add src/routes/api/slots/book/+server.ts
git commit -m "feat: notify admin on slot booking via FCM"
```

---

## Task 4 — Change Request Flow

**Files:**
- Create: `src/routes/api/slots/request-change/+server.ts`
- Modify: `src/routes/[eventId]/+page.svelte`

### 4.1 — Creare endpoint `/api/slots/request-change`

- [ ] **Step 4.1: Creare `src/routes/api/slots/request-change/+server.ts`**

```ts
import { adminFirestore as db } from '$lib/firebase/firebase-admin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notifyAdmins } from '$lib/firebase/notify-admins.server';

export const POST: RequestHandler = async ({ request }) => {
    let body: { token?: string; requestedSlotId?: string; note?: string };

    try {
        body = await request.json();
    } catch {
        return json({ error: 'JSON non valido' }, { status: 400 });
    }

    const { token, requestedSlotId, note = '' } = body;

    if (!token || !requestedSlotId) {
        return json({ error: 'token e requestedSlotId sono richiesti' }, { status: 400 });
    }

    // Resolve speaker
    const speakerSnap = await db.collection('speakers')
        .where('token', '==', token)
        .limit(1)
        .get();

    if (speakerSnap.empty) {
        return json({ error: 'Token non valido' }, { status: 401 });
    }

    const speakerDoc = speakerSnap.docs[0];
    const speaker = speakerDoc.data();

    if (speaker.status !== 'booked') {
        return json({ error: 'Non hai ancora una prenotazione attiva' }, { status: 400 });
    }

    // Find current slot
    const currentSlotSnap = await db.collection('slots')
        .where('speakerUid', '==', speakerDoc.id)
        .where('status', '==', 'BOOKED')
        .limit(1)
        .get();

    if (currentSlotSnap.empty) {
        return json({ error: 'Slot corrente non trovato' }, { status: 404 });
    }

    const currentSlot = currentSlotSnap.docs[0];

    // Verify requested slot is available
    const requestedSlotDoc = await db.collection('slots').doc(requestedSlotId).get();

    if (!requestedSlotDoc.exists) {
        return json({ error: 'Slot richiesto non trovato' }, { status: 404 });
    }

    if (requestedSlotDoc.data()!.status !== 'AVAILABLE') {
        return json({ error: 'Lo slot richiesto non è disponibile' }, { status: 409 });
    }

    // Write change request
    await db.collection('change_requests').add({
        speakerDocId: speakerDoc.id,
        speakerName: speaker.name as string,
        currentSlotId: currentSlot.id,
        currentSlotTime: currentSlot.data().startTime as string,
        requestedSlotId,
        requestedSlotTime: requestedSlotDoc.data()!.startTime as string,
        note: note.slice(0, 500),
        status: 'pending',
        createdAt: new Date().toISOString()
    });

    // Notify admin
    const currentHora = new Date(currentSlot.data().startTime as string)
        .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    const requestedHora = new Date(requestedSlotDoc.data()!.startTime as string)
        .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

    await notifyAdmins(
        '🔄 Richiesta cambio slot',
        `${speaker.name}: ${currentHora} → ${requestedHora}${note ? ` — "${note.slice(0, 60)}"` : ''}`
    );

    return json({ message: 'Richiesta inviata con successo' }, { status: 200 });
};
```

### 4.2 — Aggiungere UI change request in `[eventId]/+page.svelte`

- [ ] **Step 4.2: Aggiungere stato per change request nel `<script>`**

Dopo `let isBooking = $state(false);` aggiungere:

```ts
let showChangeForm = $state(false);
let changeRequestedSlotId = $state('');
let changeNote = $state('');
let isRequestingChange = $state(false);
let changeRequestError = $state('');
let changeRequestSent = $state(false);

async function submitChangeRequest() {
  if (!changeRequestedSlotId) return;
  isRequestingChange = true;
  changeRequestError = '';
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const res = await fetch('/api/slots/request-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, requestedSlotId: changeRequestedSlotId, note: changeNote })
  });
  if (res.ok) {
    changeRequestSent = true;
    showChangeForm = false;
  } else {
    const err = await res.json();
    changeRequestError = err.error ?? 'Errore durante la richiesta';
  }
  isRequestingChange = false;
}
```

- [ ] **Step 4.3: Aggiungere UI change request nella view `slots`**

Nella view `slots`, subito dopo il banner verde "✅ Sei già prenotato" (`{#if myBookedSlot}` block), aggiungere:

```svelte
{#if myBookedSlot}
  <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
    <p class="text-green-700 font-semibold">
      ✅ Sei già prenotato per le {formatTime(myBookedSlot.startTime)}
    </p>

    {#if changeRequestSent}
      <p class="text-sm text-gray-500 mt-2">
        ✅ Richiesta inviata a Michele. Ti risponderà su Telegram <strong>@michele_scarpa</strong>.
      </p>
    {:else if showChangeForm}
      <div class="mt-3 text-left space-y-2">
        <label class="block text-xs text-gray-600 font-medium">Slot che preferiresti:</label>
        <select
          bind:value={changeRequestedSlotId}
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">— Seleziona uno slot —</option>
          {#each slots.filter(s => s.status === 'AVAILABLE') as s (s.docId)}
            <option value={s.docId}>{formatTime(s.startTime)} – {formatTime(s.endTime)}</option>
          {/each}
        </select>
        <textarea
          bind:value={changeNote}
          placeholder="Note per Michele (opzionale)"
          rows="2"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
        ></textarea>
        {#if changeRequestError}
          <p class="text-xs text-red-600">{changeRequestError}</p>
        {/if}
        <div class="flex gap-2">
          <button
            onclick={submitChangeRequest}
            disabled={!changeRequestedSlotId || isRequestingChange}
            class="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isRequestingChange ? 'Invio...' : 'Invia richiesta'}
          </button>
          <button
            onclick={() => { showChangeForm = false; changeRequestError = ''; }}
            class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Annulla
          </button>
        </div>
      </div>
    {:else}
      <button
        onclick={() => { showChangeForm = true; }}
        class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline"
      >
        Vuoi cambiare slot? →
      </button>
    {/if}
  </div>
{/if}
```

- [ ] **Step 4.4: Verificare TypeScript**

```bash
npm run check
```
Atteso: 0 errori.

- [ ] **Step 4.5: Commit**

```bash
git add src/routes/api/slots/request-change/+server.ts \
        src/routes/\[eventId\]/+page.svelte
git commit -m "feat: change request flow — speaker can request slot change, admin notified via FCM"
```

---

## Verifica finale

- [ ] **Step 5.1: Build completo**

```bash
npm run build
```
Atteso: build senza errori (il comando include `generate-sw` che rigenera il firebase-messaging-sw.js).

- [ ] **Step 5.2: Test manuale — flusso speaker**

1. Aprire `/{eventId}?token=<token_valido>` — verificare banner onboarding
2. Cliccare ✕ sul banner, ricaricare — banner non deve ricomparire nella stessa sessione
3. Verificare dot `● Aggiornamento in tempo reale` appare dopo il primo snapshot
4. Verificare badge `★ Disponibile` con tooltip sugli slot preferred
5. Verificare hint Programma compare solo se slot non selezionato
6. Prenotare uno slot → schermata confermata con info logistiche + bottone Add to Calendar
7. Cliccare "Aggiungi al calendario" → deve aprire Google Calendar pre-compilato
8. Tornare alla pagina → vedere "Sei già prenotato" + link "Vuoi cambiare slot?"
9. Verificare change request form con select slot disponibili + textarea note
10. Inviare richiesta → conferma "Richiesta inviata"
11. Verificare footer Bacarotech presente su tutte le view

- [ ] **Step 5.3: Test manuale — notifiche admin**

1. Accedere alla pagina admin
2. Cliccare l'icona campanella nell'header admin — autorizzare notifiche
3. Da un'altra sessione (speaker), prenotare uno slot
4. Verificare che l'admin riceva notifica push: "🎤 Nuova prenotazione — [Nome] ha prenotato le XX:XX"
5. Da speaker, fare richiesta cambio slot
6. Verificare notifica admin: "🔄 Richiesta cambio slot — [Nome]: XX:XX → YY:YY"

- [ ] **Step 5.4: Commit finale**

```bash
git add -A
git commit -m "chore: final verification — speaker UX improvements complete"
```
