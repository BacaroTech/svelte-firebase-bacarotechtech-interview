# Speaker UX Improvements — Design Spec
**Data:** 2026-04-14  
**Evento target:** Global Azure Veneto 2026 (azure-vicenza, 2026-04-17)  
**Autore:** Michele / Bacarotech  

---

## Contesto

La webapp permette agli speaker dell'evento di prenotare uno slot per l'intervista con Michele di Bacarotech. Gli speaker ricevono via email un link personale con token (`/{eventId}?token=xxx`). Questa spec copre un set di miglioramenti UX, informativi e funzionali emersi dall'analisi dell'esperienza dello speaker.

---

## Gruppo A — UI/UX pura (nessuna API nuova)

### A1. Banner onboarding contestuale

**File:** `src/routes/[eventId]/+page.svelte`  
**View:** `slots` (speaker autenticato)

Una card info collassabile in cima alla lista slot, mostrata solo alla prima visita:

> "Prenota il tuo slot per la chiacchierata con Michele di Bacarotech — 5-7 minuti, free-style. Gli slot in verde ★ sono quelli che hai indicato disponibili via email."

- Si chiude con ✕
- Stato chiusura salvato in `sessionStorage('onboarding_dismissed')`
- Non riappare al refresh della stessa sessione

### A2. Label "Preferenza" → "★ Disponibile"

**File:** `src/routes/[eventId]/+page.svelte`  
**Snippet:** `slotRow`

- Badge testo: `★ Preferenza` → `★ Disponibile`
- Tooltip (via `title` attribute): "Slot che hai indicato disponibile via email"
- Nessuna modifica al dato Firestore (`preferredSlots` rimane invariato)

### A3. Hint tab Programma

**File:** `src/routes/[eventId]/+page.svelte`  
**View:** `slots`, mostrato solo se `!selectedSlot && !myBookedSlot`

```
💡 Usa il tab "Programma" per vedere il tuo talk e scegliere uno slot 
   che non si sovrapponga alla tua sessione.
```

Testo grigio piccolo, non un box in rilievo — hint passivo.

### A4. Indicatore real-time

**File:** `src/routes/[eventId]/+page.svelte`

- Variabile `$state isLive = false`, settata a `true` nell'`$effect` quando `onSnapshot` riceve il primo evento
- Render: `● Live` — dot verde animato (pulse CSS) + testo `text-xs text-green-500`
- Posizione: accanto al titolo della sezione slot

### A5. Messaggio race condition migliorato

**File:** `src/routes/[eventId]/+page.svelte`  
**Funzione:** `book()`

Se `res.ok === false` e l'errore contiene "non è disponibile":
> "Qualcuno ha appena prenotato questo slot, scegline un altro 👇"

Altrimenti mostra l'errore generico come ora.

---

## Gruppo B — Informazioni logistiche e trasparenza

### B1. Info logistiche nella schermata confirmed

**File:** `src/routes/[eventId]/+page.svelte`  
**View:** `confirmed`

Card informativa sotto il ✅:

```
📍 Dove trovarmi
   Area divanetti vicino alla reception
   Cerca la DJI Action su cavalletto

📱 Imprevisti last-minute
   WhatsApp / Telegram: @michele_scarpa · 348 348 2541
```

Statica, hardcoded nella view.

### B2. Trasparenza nomi speaker visibili

**File:** `src/routes/[eventId]/+page.svelte`  
**View:** `slots` e `scheduleOverview`

Hint discreto sotto la lista slot (sia interattiva che read-only):

> "👥 I nomi degli altri speaker sono visibili: così potete organizzarvi autonomamente se avete esigenze di orario simili."

Font `text-xs text-gray-400`, nessun box.

### B3. Footer "Made by Bacarotech" con nota costi

**File:** `src/routes/[eventId]/+page.svelte`  
**Posizione:** sotto ogni view (form, slots, confirmed, error)

Footer fisso in fondo alla pagina:

```
[logo 20px] Bacarotech — associazione culturale no-profit, gestita da volontari.
Questa webapp usa strumenti gratuiti o a costo minimo per contenere i costi.
Alcune funzionalità (es. notifica email di conferma) non sono disponibili per questa ragione.
```

Stile: `bg-gray-50 border-t border-gray-200 p-4 text-xs text-gray-400 text-center`  
Logo: `$lib/assets/icon.png` già presente, 20px

---

## Gruppo C — Change Request Flow

### C1. Bottone "Voglio cambiare slot"

**File:** `src/routes/[eventId]/+page.svelte`  
**View:** `slots`, visibile solo se `myBookedSlot !== null`

Sotto il banner "✅ Sei già prenotato per le XX:XX", link/bottone secondario:
> "Vuoi cambiare? →"

Al click, apre un mini-form inline (no modal):
- Select: lista degli slot `AVAILABLE` con label orario
- Textarea opzionale: "Note per Michele (opzionale)"
- Bottone: "Invia richiesta"
- Bottone: "Annulla"

### C2. API endpoint `/api/slots/request-change`

**File:** `src/routes/api/slots/request-change/+server.ts` (nuovo)  
**Metodo:** POST  
**Body:** `{ token: string, requestedSlotId: string, note?: string }`

Logica:
1. Valida token → risolve speaker
2. Verifica che speaker abbia uno slot booked (`status: 'booked'`)
3. Verifica che `requestedSlotId` sia `AVAILABLE`
4. Scrive in `change_requests` collection: `{ speakerDocId, speakerName, currentSlotId, currentSlotTime, requestedSlotId, requestedSlotTime, note, status: 'pending', createdAt }`
5. Invia notifica FCM agli admin token (vedi Gruppo D)
6. Risponde `200 { message: 'Richiesta inviata' }`

**Lo slot non viene cambiato automaticamente.** L'admin approva dal pannello.

### C3. UI feedback post-richiesta

View locale `'changeRequested'` (aggiunta agli stati):
> "✅ Richiesta inviata a Michele. Ti risponderà appena possibile su Telegram @michele_scarpa."

---

## Gruppo D — FCM Notifica Admin

### D1. Campo `role` nei FCM token

**File:** `src/routes/api/save-token/+server.ts`  
Aggiunto campo opzionale `role: 'admin' | 'speaker'` nel body (default: `'speaker'`).  
Salvato nel documento Firestore `fcm_tokens/{token}`.

**File:** `src/lib/components/notification/InterviewNotification.svelte`  
Aggiunta prop `role: string = 'speaker'`, passata al `/api/save-token`.

**File:** `src/routes/admin/+layout.svelte` (o la pagina admin appropriata)  
Usa `<InterviewNotification role="admin" />` per registrare l'admin.

### D2. Funzione helper `notifyAdmins`

**File:** `src/lib/firebase/notify-admins.server.ts` (nuovo)

```ts
export async function notifyAdmins(title: string, body: string): Promise<void>
```

- Query `fcm_tokens` dove `role == 'admin'`
- Invia via Firebase Admin Messaging (`sendEach`)
- Rimuove token invalidi (stessa logica di `/api/send-broadcast`)
- Non lancia eccezioni — fallimento notifica non deve bloccare la risposta API

### D3. Trigger notifiche

- **Booking confermato** (`/api/slots/book`): dopo la transaction, chiama `notifyAdmins("🎤 Nuova prenotazione", "[Nome] ha prenotato le [ora]")`
- **Change request** (`/api/slots/request-change`): chiama `notifyAdmins("🔄 Richiesta cambio", "[Nome]: [ora attuale] → [ora richiesta]")`

### D4. Firebase Messaging Service Worker

**File:** `static/firebase-messaging-sw.js` (nuovo)

Necessario per ricevere notifiche push in background su browser. Importa Firebase compat SDK e configura `onBackgroundMessage`.

**Nota:** il file usa le variabili d'ambiente Firebase (apiKey, projectId, ecc.) ma deve essere un file statico (non può usare `$env`). Le config vanno hardcodate o iniettate in build tramite `vite.config.ts`.

---

## Gruppo E — Add to Calendar

### E1. Bottone Google Calendar

**File:** `src/routes/[eventId]/+page.svelte`  
**View:** `confirmed`

Funzione client-side `buildGCalUrl(slot: InterviewSlot): string`:

```ts
function buildGCalUrl(slot: InterviewSlot): string {
  const start = slot.startTime.replace(/[-:]/g, '').replace('.000Z', 'Z');
  const end   = slot.endTime.replace(/[-:]/g, '').replace('.000Z', 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Intervista Bacarotech — Global Azure Veneto 2026',
    dates: `${start}/${end}`,
    details: 'Chiacchierata free-style con Michele di Bacarotech. 5-7 minuti.',
    location: 'Area divanetti, vicino alla reception'
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
```

Bottone: "📅 Aggiungi al calendario" → `window.open(url, '_blank')`  
Nessuna dipendenza server, funziona ovunque.

---

## Punto 9 — Race condition (già risolta)

`/api/slots/book/+server.ts` usa già `db.runTransaction()` con check `status !== 'AVAILABLE'`.  
Unico intervento: migliorare il messaggio di errore (vedere A5).

---

## Ordine di implementazione suggerito

1. **A + B** (UI/UX pura, nessun backend) — modifiche a `[eventId]/+page.svelte`
2. **E** (Add to Calendar) — solo `[eventId]/+page.svelte`
3. **D** (FCM admin) — `save-token`, helper `notifyAdmins`, SW
4. **C** (Change request) — dipende da D per le notifiche

---

## File coinvolti

| File | Tipo | Note |
|------|------|------|
| `src/routes/[eventId]/+page.svelte` | modifica | Maggior parte dei cambiamenti |
| `src/routes/api/slots/request-change/+server.ts` | nuovo | Change request API |
| `src/routes/api/save-token/+server.ts` | modifica | Aggiunge campo `role` |
| `src/lib/components/notification/InterviewNotification.svelte` | modifica | Prop `role` |
| `src/lib/firebase/notify-admins.server.ts` | nuovo | Helper FCM admin |
| `src/routes/api/slots/book/+server.ts` | modifica | Chiama `notifyAdmins` + errore race |
| `static/firebase-messaging-sw.js` | nuovo | SW per notifiche background |
