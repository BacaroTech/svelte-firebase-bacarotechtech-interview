# Event Schedule Feature — Design Spec
Date: 2026-04-13

## Overview

Aggiungere la visualizzazione del programma dell'evento a tutte le viste dell'app (speaker, admin, readonly), con correlazione visiva tra talk del programma e slot di intervista.

## Goals

- Speaker, admin e utente readonly possono vedere il programma dell'evento
- Mentre si guarda uno slot di intervista, si vede quali talk avvengono in parallelo
- Il talk dello speaker viene evidenziato nella sua vista personale
- Nessuna modifica al backend (Firestore)

## Data Layer

### File: `src/lib/config/schedule.ts`

Esporta un array statico di `TalkSession` estratto dall'HTML `doc/schedulazione-vicenza.html`.

```ts
interface TalkSession {
  id: string;           // sessionid dall'HTML originale
  title: string;
  speakers: string[];   // nomi speaker
  room: string;         // "Palladio 1", "Palladio 2", "Trissino", "Verdi", "Mozart"
  startTime: string;    // ISO UTC, es. "2026-04-17T07:00:00.000Z"
  endTime: string;      // ISO UTC
  isService: boolean;   // true per Keynote, Coffee Break, Lunch, sponsor slot
}
```

### Helper: `getTalksAtTime(time: string): TalkSession[]`

Restituisce i talk non-service che si sovrappongono temporalmente a un dato orario ISO.
Logica: `talkStart <= time < talkEnd`.

## Routing

Tre nuove route, tutte mostrano `EventSchedule.svelte`:

| Route | Layout | Accesso |
|---|---|---|
| `/app/schedule` | `app/+layout.svelte` | Speaker loggato |
| `/admin/schedule` | `admin/+layout.svelte` | Admin loggato |
| `/[eventId]/schedule` | route standalone | Readonly, no login |

Aggiungere link "Programma" nel nav dei layout `app` e `admin`. La route readonly non ha layout condiviso, mostra direttamente `EventSchedule.svelte` con eventId nel titolo.

## Componenti

### `EventSchedule.svelte`
Props:
- `highlightSpeakerName?: string` — se passato, evidenzia il talk dello speaker in giallo

Struttura:
- Raggruppa i talk per fascia oraria
- Le sessioni `isService` appaiono come separatori grigi (Coffee Break, Lunch, ecc.)
- Ogni talk mostra: room (badge colorato per sala), titolo, speaker(s)
- Il talk evidenziato ha sfondo giallo/arancio e icona "★ Il tuo talk"

### `ScheduleSidebar.svelte`
Props:
- `activeSlotTime?: string` — orario ISO dello slot selezionato/hoverato

Comportamento:
- Lista compatta del programma, scrollabile
- Quando `activeSlotTime` cambia, scrolla automaticamente alla fascia oraria corrispondente e la evidenzia con bordo colorato

### Modifica a `CardSlot.svelte` / `BookCardSlot.svelte`
- Aggiungere sezione "Talk in corso" sotto i dati dello slot
- Chiama `getTalksAtTime(slot.startTime)` per ottenere i talk paralleli
- Mostra: room + titolo per ogni talk
- Accetta prop opzionale `speakerTalk?: string` — il valore di `Speaker.talk` (titolo del talk) disponibile solo in `/app/home` dove lo speaker è autenticato
- Se `speakerTalk` è presente, il talk il cui titolo contiene la stringa (match parziale case-insensitive) viene evidenziato con badge colorato "Il tuo talk"

## State Management

Nella pagina `app/home/+page.svelte`:
- `let activeSlotTime = $state<string | undefined>(undefined)`
- Passato a `ScheduleSidebar` e aggiornato da `CardSlot` al hover/focus

Prop drilling puro — nessun store globale.

## Layout delle pagine esistenti

### `app/home/+page.svelte`
Trasformata in layout a 2 colonne:
- Colonna sinistra (2/3): lista slot esistente
- Colonna destra (1/3): `ScheduleSidebar`

### `interview/+page.svelte` (vista pubblica calendario)
Aggiungere `ScheduleSidebar` accanto a `CalendarInterview`. Nessun highlight (la route non carica profilo speaker — no auth, no token). Solo visualizzazione programma affiancata.

## Out of Scope

- Slot fittizi in Firestore basati sui talk
- Sincronizzazione real-time del programma
- Filtro per sala nella vista programma
