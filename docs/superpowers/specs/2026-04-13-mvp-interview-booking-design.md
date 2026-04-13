# MVP Interview Booking — Design Spec
**Data:** 2026-04-13  
**Autore:** Michele (Bacarotech)  
**Obiettivo:** Webapp funzionante entro giovedì 16 aprile per gestire prenotazioni interviste agli eventi Azure Global Meetup Vicenza (venerdì 17) e GDG Pisa (sabato 18).

---

## 1. Routing

```
/azure-vicenza?token=<uuid>   → Flusso speaker pubblico (Azure Vicenza, venerdì)
/gdg-pisa?token=<uuid>        → Flusso speaker pubblico (GDG Pisa, sabato)

/admin/login                  → Form password admin
/admin/azure-vicenza          → Dashboard admin Vicenza
/admin/gdg-pisa               → Dashboard admin Pisa
```

---

## 2. Stack e dipendenze

- **SvelteKit 5** (runes, adapter-vercel)
- **Firebase Firestore** (dati) + **Firebase Admin SDK** (server-side)
- **Firebase Auth rimosso** dal flusso speaker e admin
- **TailwindCSS 4**
- **Admin auth:** cookie server-side firmato da SvelteKit, password in `.env`
- **Speaker auth:** token UUID v4 nella query string, nessun account

---

## 3. Modello dati Firestore

### Collezione `slots`

```ts
interface InterviewSlot {
  docId: string;          // Firestore doc ID
  id: string;             // UUID interno
  eventId: string;        // 'azure-vicenza' | 'gdg-pisa'
  startTime: string;      // ISO string
  endTime: string;        // ISO string
  status: 'AVAILABLE' | 'BOOKED' | 'DONE' | 'PROBLEMA' | 'ANNULLATO';
  speakerUid: string | null;   // docId Firestore dello speaker prenotato (non il token)
  speakerName: string | null;
  bookedAt: string | null;
}
```

### Collezione `speakers`

```ts
interface Speaker {
  docId: string;
  name: string;
  email: string | null;
  talk: string | null;
  token: string;           // UUID v4, usato come chiave nel link
  eventId: string;         // 'azure-vicenza' | 'gdg-pisa'
  preferredSlots: string[]; // array di slot IDs preferiti (pre-dichiarati)
  notes: string;           // vincoli dichiarati (es. "deve uscire alle 14:30")
  status: 'pending' | 'booked';
}
```

---

## 4. Slot Azure Vicenza (venerdì 17 aprile)

Due blocchi da 5 slot ciascuno (~12 min per intervista):

**Blocco Mattina** (12:30–13:30, tra ultimo talk e pranzo):
- 12:30–12:42
- 12:42–12:54
- 12:54–13:06
- 13:06–13:18
- 13:18–13:30

**Blocco Pomeriggio** (14:50–15:40, coffee break incluso):
- 14:50–15:02
- 15:02–15:14
- 15:14–15:26
- 15:26–15:38
- 15:38–15:50

---

## 5. Flusso Speaker (pubblico, no auth)

### Accesso con token
1. `+page.server.ts` legge `token` dalla query string e `eventId` dal path
2. Query Firestore: `speakers` dove `token == token` AND `eventId == eventId`
3. Carica tutti gli slot dell'evento
4. Passa alla pagina: `speaker`, `slots`, `eventId`

### UI mobile-first
- Header: "Ciao [Nome] 👋 — [Nome evento]" + talk del relatore
- Lista slot cronologica:
  - Slot disponibile → verde, cliccabile
  - Slot disponibile + preferito dal relatore → verde scuro con badge "La tua preferenza"
  - Slot occupato → grigio, non cliccabile, mostra "Occupato"
  - Slot selezionato → blu, con pulsante "Conferma prenotazione"
- Post-conferma: schermata "Sei prenotato per le [ora] ✓ — Ci vediamo venerdì!"

### Accesso senza token
- Form con campo Nome (obbligatorio) + Email (opzionale)
- Submit → cerca speaker per nome nell'evento → se trovato (match esatto case-insensitive), carica il suo flusso normale
- Se trovati più speaker con lo stesso nome → mostra lista per disambiguare
- Se non trovato → mostra tutti gli slot disponibili, il nome inserito viene usato per la prenotazione (guest booking)

### Token non valido
- Pagina di errore: "Link non valido o scaduto — Contatta Michele su Telegram"

### API booking senza auth
`POST /api/slots/book` accetta `{ slotId, token }` — il server risolve il nome dello speaker dal token, esegue la transazione Firestore.

---

## 6. Flusso Admin (password protetto)

### Auth
- `ADMIN_PASSWORD` in `.env`
- `POST /admin/login` verifica la password, imposta cookie `__admin_session` (valore: hash HMAC della password + secret)
- `hooks.server.ts`: per ogni richiesta a `/admin/*` verifica il cookie; se assente → redirect a `/admin/login`
- Rimossa tutta la logica Firebase Auth da `hooks.server.ts`

### Dashboard `/admin/[eventId]`

**Tab navigazione:** `Azure Vicenza` | `GDG Pisa`

**Sezioni:**
1. **Calendario** — `CalendarSlot.svelte` esistente, filtrato per `eventId`
2. **Lista speaker** — tabella: Nome | Talk | Slot prenotato | Link (pulsante "Copia link")
3. **Stato slot** — click su uno slot nel calendario → dropdown: `AVAILABLE / BOOKED / DONE / PROBLEMA / ANNULLATO`
4. **Aggiungi speaker** — form: Nome, Email, Talk, Note vincoli → genera token, mostra link copiabile
5. **Popola slot** — crea gli slot della giornata (già esiste, aggiungere `eventId`)
6. **Reset slot** — elimina tutti gli slot dell'evento (già esiste, filtrare per `eventId`)

---

## 7. Modifiche API

| Endpoint | Metodo | Cambiamento |
|---|---|---|
| `/api/slots` | GET | Aggiungere filtro `?eventId=xxx` |
| `/api/slots` | POST | Aggiungere `eventId` nel body |
| `/api/slots/[id]` | PATCH | Nuovo endpoint — aggiorna `status` |
| `/api/slots/book` | POST | Accetta `token` invece di session cookie |
| `/api/speaker/[token]` | GET | Nuovo — restituisce speaker by token |
| `/api/speaker` | POST | Aggiungere generazione `token` UUID |
| `/admin/login` | POST | Nuovo — verifica password, imposta cookie |

---

## 8. Script di seed

`scripts/seed-azure-vicenza.ts` — da eseguire una sola volta:

1. Legge `doc/stato.json`
2. Crea gli slot in Firestore (10 slot, `eventId: 'azure-vicenza'`)
3. Crea i documenti speaker con token UUID generati, preferenze pre-impostate (Guido/Carlo/Salvatore → mattina), note salvate
4. Stampa in console la lista di link pronti:
   ```
   Guido Imperatore    → https://<VERCEL_URL>/azure-vicenza?token=abc123
   Carlo Ciciriello    → https://<VERCEL_URL>/azure-vicenza?token=def456
   ...
   ```
   Il dominio viene letto da variabile d'ambiente `PUBLIC_BASE_URL` (es. `https://bacarotech-interview.vercel.app`). In dev usa `http://localhost:5173`.

---

## 9. Componenti da creare / modificare

| Componente | Azione |
|---|---|
| `src/routes/[eventId]/+page.svelte` | Nuovo — speaker booking page |
| `src/routes/[eventId]/+page.server.ts` | Nuovo — load speaker by token |
| `src/routes/admin/+layout.server.ts` | Modificare — check cookie admin |
| `src/routes/admin/login/+page.svelte` | Nuovo — form password |
| `src/routes/admin/[eventId]/+page.svelte` | Nuovo — dashboard admin |
| `src/hooks.server.ts` | Modificare — rimuovere Firebase Auth, aggiungere admin cookie check |
| `src/lib/components/slots/CalendarSlot.svelte` | Invariato — funziona già |
| `src/lib/type/slots.d.ts` | Modificare — aggiungere stati DONE/PROBLEMA/ANNULLATO e tipo Speaker |
| `scripts/seed-azure-vicenza.ts` | Nuovo — seed dati Azure Vicenza |

---

## 10. Cosa NON è nell'MVP

- Notifiche push / FCM (il sistema esiste ma non è prioritario)
- GDG Pisa data (lo script seed verrà duplicato quando arrivano i dati)
- Modifica slot dopo la prenotazione (cancel/rebook) — gestito manualmente dall'admin
- Autenticazione Google (rimossa, da ripristinare in futuro se serve)
