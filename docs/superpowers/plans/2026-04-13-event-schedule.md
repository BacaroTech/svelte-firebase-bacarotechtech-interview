# Event Schedule Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere visualizzazione del programma dell'evento (Global Azure Meetup Vicenza 2026-04-17) in tutte le viste (speaker, admin, readonly), con correlazione visiva tra talk in programma e slot di intervista.

**Architecture:** Dati del programma come array statico TypeScript (`schedule.ts`). Due componenti Svelte: `EventSchedule` (vista completa) e `ScheduleSidebar` (compatta). La route `[eventId]/+page.svelte` riceve una nuova tab "Programma" e mostra la sidebar accanto agli slot. L'admin ha una pagina dedicata `/admin/schedule`.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript, Tailwind CSS v4

---

## File Map

| File | Azione | Responsabilità |
|---|---|---|
| `src/lib/config/schedule.ts` | CREATE | TalkSession type, array statico 38 sessioni, helper `getTalksAtTime` |
| `src/lib/components/schedule/EventSchedule.svelte` | CREATE | Vista completa programma raggruppato per orario, con highlight speaker |
| `src/lib/components/schedule/ScheduleSidebar.svelte` | CREATE | Vista compatta sidebar con highlight blocco attivo e auto-scroll |
| `src/routes/[eventId]/+page.svelte` | MODIFY | Aggiungere tab Prenota/Programma, sidebar su desktop, talk nel slotRow |
| `src/routes/admin/schedule/+page.svelte` | CREATE | Pagina programma per admin (route statica, no server) |
| `src/routes/admin/+layout.svelte` | MODIFY | Aggiungere link "Programma" nel nav header |

---

## Task 1: Create `src/lib/config/schedule.ts`

**Files:**
- Create: `src/lib/config/schedule.ts`

- [ ] **Step 1: Create the file with type, data and helper**

```typescript
// src/lib/config/schedule.ts

export interface TalkSession {
  id: string;
  title: string;
  speakers: string[];
  room: string;
  startTime: string; // ISO UTC
  endTime: string;   // ISO UTC
  isService: boolean; // true per Coffee Break, Lunch, sponsor slot
}

export const SESSIONS: TalkSession[] = [
  // 09:00 — Keynote plenum
  { id: '1125949', title: 'Keynote - Global Azure 2026', speakers: ['Luigi Pandolfino', 'Andrea Marchi'], room: 'Palladio 1', startTime: '2026-04-17T07:00:00.000Z', endTime: '2026-04-17T08:00:00.000Z', isService: false },
  // 10:00 — Keynote Tiziano Durante (service)
  { id: '4eeb2fae', title: 'Keynote: Tiziano Durante', speakers: [], room: 'Palladio 1', startTime: '2026-04-17T08:00:00.000Z', endTime: '2026-04-17T08:20:00.000Z', isService: true },
  // 10:20 — Coffee Break
  { id: '930bf39f', title: 'Coffee Break', speakers: [], room: '', startTime: '2026-04-17T08:20:00.000Z', endTime: '2026-04-17T08:50:00.000Z', isService: true },
  // 10:50 — sessioni parallele
  { id: '1126803', title: 'Microsoft Foundry: The Agent Revolution', speakers: ['Roberta Bruno', 'Guenda Sciancalepore'], room: 'Palladio 1', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  { id: 'b23a6ef7', title: 'Da 1.8M€ a Zero Visibility: Purple Teaming Data-Driven per Microsoft Security Stack', speakers: [], room: 'Palladio 2', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: true },
  { id: '1113384', title: 'Active Directory Evolution in Windows Server 2025: Migrazione e Best Practices', speakers: ['Nicola Ferrini'], room: 'Trissino', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  { id: '1122975', title: 'Azure e la frontiera della Produttività: analisi economica dello scaling industriale', speakers: ['Andrea Saravalle'], room: 'Verdi', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  { id: '1128972', title: 'Observing applications from Dev to Azure with .NET Aspire', speakers: ['Alessandro Melchiori'], room: 'Mozart', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  // 11:40 — sessioni parallele
  { id: '1092822', title: 'AI e Governance Multi-Cloud: due facce della stessa medaglia tra innovazione e rischio', speakers: ['Francesco Molfese'], room: 'Palladio 1', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1125183', title: 'Identity Threat Defense end\u2011to\u2011end', speakers: ['Zeno Testoni'], room: 'Palladio 2', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1116487', title: 'The hard way of a Kusto Ninja: Azure Monitor, Log Analytics e dashboard che contano davvero', speakers: ['Giuliano Latini'], room: 'Trissino', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1096052', title: 'Dal Networking alla Data Platform: Architetture Azure Databricks per Scalabilità e Sicurezza', speakers: ['Carlo Pio Luigi Ciciriello', 'Salvatore Cavallaro'], room: 'Verdi', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1114998', title: 'Blockchain as a Service? Con Azure Confidential Ledger è realtà', speakers: ['Mattia Contessa'], room: 'Mozart', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  // 12:30 — Light Lunch
  { id: 'd7cf7d93', title: 'Light Lunch', speakers: [], room: '', startTime: '2026-04-17T10:30:00.000Z', endTime: '2026-04-17T12:00:00.000Z', isService: true },
  // 14:00 — sessioni parallele
  { id: '1132703', title: 'Dalla security alla compliance: i vantaggi del cloud in casa con Azure Local', speakers: ['Silvio Di Benedetto'], room: 'Palladio 1', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  { id: '1121099', title: 'Identità, accessi e sicurezza zero trust: un viaggio pratico dentro Entra Suite', speakers: ['Roberto Tafuri'], room: 'Palladio 2', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  { id: '631da94f', title: 'Avepoint', speakers: [], room: 'Trissino', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:15:00.000Z', isService: true },
  { id: '1114543', title: 'Riduzione costi, data anti-gravity e geo-distribuzione del dato: una tripletta (im)possibile?', speakers: ['Alessandro Dellavedova'], room: 'Verdi', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  { id: '1125515', title: 'Virtualizzazione: oltre il modello tradizionale', speakers: ['Roberto Corso'], room: 'Mozart', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  // 14:15
  { id: '1119223', title: 'Hybrid Exchange senza dolore: il merge degli attributi in Exchange Online', speakers: ['Paolo Miotti'], room: 'Trissino', startTime: '2026-04-17T12:15:00.000Z', endTime: '2026-04-17T12:55:00.000Z', isService: false },
  // 14:50
  { id: '1130376', title: 'Azure PaaS networking how-to', speakers: ['Marco Obinu'], room: 'Palladio 1', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  { id: '1093279', title: 'Il Dato è un Tesoro: Purview DLP è il Guardiano del Valore Aziendale', speakers: ['Guido Imperatore'], room: 'Palladio 2', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  { id: '1117687', title: 'Il Cloud ha un prezzo (ma decidi tu quale): Le basi del Cost Management in Azure.', speakers: ['Emanuele Ciminaghi'], room: 'Verdi', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  { id: '1120042', title: 'Private AI di NT: dati, strategie e tecnologie per la Sovranità dei dati', speakers: ['Maila Zorzenone'], room: 'Mozart', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:05:00.000Z', isService: false },
  // 14:55
  { id: '1132918', title: 'Email applicative tra Azure e Microsoft 365: opzioni, limiti e best practice', speakers: ['Raffaele Colavecchi'], room: 'Trissino', startTime: '2026-04-17T12:55:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  // 15:10
  { id: '1118559', title: 'Azure - Opportunità per Reseller e ISV Microsoft', speakers: ['Michele Ruberti'], room: 'Mozart', startTime: '2026-04-17T13:10:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  // 15:40 — Coffee Break
  { id: '0e66aec9', title: 'Coffee Break', speakers: [], room: '', startTime: '2026-04-17T13:40:00.000Z', endTime: '2026-04-17T14:10:00.000Z', isService: true },
  // 16:10 — sessioni parallele
  { id: '1121324', title: 'Azure Firewall o FortiGate (NVA)? Guida pratica alla scelta', speakers: ['Luca Torresi'], room: 'Palladio 1', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  { id: '1125851', title: 'Abbiamo Microsoft Security Copilot\u2026 e adesso?', speakers: ['Marco Passanisi'], room: 'Palladio 2', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  { id: '1114634', title: "Cloud sotto attacco: l'evoluzione necessaria oltre la sicurezza tradizionale", speakers: ['Elias Moioli'], room: 'Trissino', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  { id: '767401bc', title: 'Elevator Innovation Hub', speakers: [], room: 'Verdi', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T14:20:00.000Z', isService: true },
  { id: '1106875', title: 'Conditional Access: No Way Home', speakers: ['Francesco Facco'], room: 'Mozart', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  // 16:20
  { id: '1118811', title: 'Journey to Cloud Magis S.p.A.', speakers: ['Paolo Zen', 'Simone Astolfi'], room: 'Verdi', startTime: '2026-04-17T14:20:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  // 17:00 — sessioni parallele
  { id: '1114754', title: 'From Cloud to Edge: delivering GPU Workstations with Azure Virtual Desktop on Azure Local', speakers: ['Samuele Provvedi', 'Enea Maestrelli'], room: 'Palladio 1', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1120583', title: 'Infrastructure as Code su Azure: facciamo chiarezza', speakers: ['Fabio Cannas'], room: 'Palladio 2', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1118224', title: 'Agentic Cloud Ops: come Azure Copilot trasforma la gestione del cloud', speakers: ['Giulio Sciarappa'], room: 'Trissino', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1092003', title: 'AI Readiness nelle PMI: la tua azienda è davvero pronta?', speakers: ['Patrick Savio'], room: 'Verdi', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1105471', title: 'Applicazioni più intelligenti con Power Platform e AI', speakers: ['Stefano Bisca'], room: 'Mozart', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
];

/**
 * Returns non-service sessions that overlap with slotStartTime.
 * Condition: session.startTime <= slotStartTime < session.endTime
 */
export function getTalksAtTime(slotStartTime: string): TalkSession[] {
  const t = new Date(slotStartTime).getTime();
  return SESSIONS.filter(s =>
    !s.isService &&
    new Date(s.startTime).getTime() <= t &&
    t < new Date(s.endTime).getTime()
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /path/to/project && npm run check
```

Expected: no errors related to `schedule.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/config/schedule.ts
git commit -m "feat: add static event schedule data and getTalksAtTime helper"
```

---

## Task 2: Create `EventSchedule.svelte`

**Files:**
- Create: `src/lib/components/schedule/EventSchedule.svelte`

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/schedule/EventSchedule.svelte -->
<script lang="ts">
  import { SESSIONS, type TalkSession } from '$lib/config/schedule';

  const { highlightSpeakerName = '' }: { highlightSpeakerName?: string } = $props();

  const ROOM_COLORS: Record<string, string> = {
    'Palladio 1': 'bg-indigo-100 text-indigo-700',
    'Palladio 2': 'bg-violet-100 text-violet-700',
    'Trissino':   'bg-teal-100 text-teal-700',
    'Verdi':      'bg-emerald-100 text-emerald-700',
    'Mozart':     'bg-amber-100 text-amber-700',
  };

  function formatLocal(isoUtc: string): string {
    return new Date(isoUtc).toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });
  }

  function isHighlighted(session: TalkSession): boolean {
    if (!highlightSpeakerName) return false;
    const name = highlightSpeakerName.toLowerCase();
    return session.speakers.some(s => s.toLowerCase().includes(name));
  }

  // Group by startTime — computed once (SESSIONS is static)
  const grouped: [string, TalkSession[]][] = (() => {
    const map = new Map<string, TalkSession[]>();
    for (const s of SESSIONS) {
      if (!map.has(s.startTime)) map.set(s.startTime, []);
      map.get(s.startTime)!.push(s);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  })();
</script>

<div class="space-y-4 pb-4">
  {#each grouped as [timeKey, sessions]}
    {@const allService = sessions.every(s => s.isService)}
    {@const realSessions = sessions.filter(s => !s.isService)}

    {#if allService}
      <!-- Service separator -->
      <div class="flex items-center gap-3 py-1">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="text-xs text-gray-400 font-medium">
          {formatLocal(timeKey)} — {sessions[0].title}
        </span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
    {:else}
      <div>
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {formatLocal(timeKey)}
        </p>
        <div class="space-y-2">
          {#each realSessions as session (session.id)}
            <div class="rounded-lg border p-3 transition-colors
              {isHighlighted(session)
                ? 'border-amber-400 bg-amber-50'
                : 'border-gray-200 bg-white'}">
              {#if isHighlighted(session)}
                <span class="text-xs font-semibold text-amber-600 mb-1 block">★ Il tuo talk</span>
              {/if}
              <div class="flex items-start gap-2">
                {#if session.room}
                  <span class="text-xs px-1.5 py-0.5 rounded font-medium shrink-0
                    {ROOM_COLORS[session.room] ?? 'bg-gray-100 text-gray-600'}">
                    {session.room}
                  </span>
                {/if}
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 leading-snug">{session.title}</p>
                  {#if session.speakers.length > 0}
                    <p class="text-xs text-gray-500 mt-0.5">{session.speakers.join(', ')}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no errors in `EventSchedule.svelte`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/schedule/EventSchedule.svelte
git commit -m "feat: add EventSchedule component with time grouping and speaker highlight"
```

---

## Task 3: Create `ScheduleSidebar.svelte`

**Files:**
- Create: `src/lib/components/schedule/ScheduleSidebar.svelte`

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/schedule/ScheduleSidebar.svelte -->
<script lang="ts">
  import { SESSIONS, type TalkSession } from '$lib/config/schedule';

  const {
    activeSlotTime = undefined,
    highlightSpeakerName = ''
  }: { activeSlotTime?: string; highlightSpeakerName?: string } = $props();

  const ROOM_ABBR: Record<string, string> = {
    'Palladio 1': 'P1',
    'Palladio 2': 'P2',
    'Trissino':   'Tri',
    'Verdi':      'Ver',
    'Mozart':     'Moz',
  };

  const ROOM_COLORS: Record<string, string> = {
    'Palladio 1': 'bg-indigo-100 text-indigo-700',
    'Palladio 2': 'bg-violet-100 text-violet-700',
    'Trissino':   'bg-teal-100 text-teal-700',
    'Verdi':      'bg-emerald-100 text-emerald-700',
    'Mozart':     'bg-amber-100 text-amber-700',
  };

  function formatLocal(isoUtc: string): string {
    return new Date(isoUtc).toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });
  }

  function isHighlighted(session: TalkSession): boolean {
    if (!highlightSpeakerName) return false;
    return session.speakers.some(s =>
      s.toLowerCase().includes(highlightSpeakerName.toLowerCase())
    );
  }

  const grouped: [string, TalkSession[]][] = (() => {
    const map = new Map<string, TalkSession[]>();
    for (const s of SESSIONS) {
      if (!map.has(s.startTime)) map.set(s.startTime, []);
      map.get(s.startTime)!.push(s);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  })();

  // timeKey of the group that contains activeSlotTime
  const activeTimeKey = $derived((() => {
    if (!activeSlotTime) return null;
    const t = new Date(activeSlotTime).getTime();
    for (const [key, sessions] of grouped) {
      if (sessions.some(s =>
        !s.isService &&
        new Date(s.startTime).getTime() <= t &&
        t < new Date(s.endTime).getTime()
      )) return key;
    }
    return null;
  })());

  let blockEls: Record<string, HTMLElement | undefined> = {};

  $effect(() => {
    const key = activeTimeKey;
    if (key && blockEls[key]) {
      blockEls[key]!.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
</script>

<div class="h-full overflow-y-auto space-y-2 pr-1">
  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Programma</p>

  {#each grouped as [timeKey, sessions]}
    {@const allService = sessions.every(s => s.isService)}
    {@const realSessions = sessions.filter(s => !s.isService)}
    {@const isActive = timeKey === activeTimeKey}

    {#if allService}
      <div class="py-0.5 flex items-center gap-2">
        <div class="flex-1 border-t border-gray-100"></div>
        <span class="text-xs text-gray-300">{formatLocal(timeKey)} {sessions[0].title}</span>
        <div class="flex-1 border-t border-gray-100"></div>
      </div>
    {:else}
      <div
        bind:this={blockEls[timeKey]}
        class="rounded-lg p-2 transition-colors
          {isActive ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-transparent'}"
      >
        <p class="text-xs font-semibold text-gray-500 mb-1">{formatLocal(timeKey)}</p>
        {#each realSessions as session (session.id)}
          <div class="flex items-start gap-1.5 mb-1 last:mb-0">
            {#if session.room}
              <span class="text-xs px-1 py-0.5 rounded font-medium shrink-0
                {ROOM_COLORS[session.room] ?? 'bg-gray-100 text-gray-500'}">
                {ROOM_ABBR[session.room] ?? session.room}
              </span>
            {/if}
            <div class="min-w-0">
              <p class="text-xs leading-snug truncate
                {isHighlighted(session) ? 'font-semibold text-amber-700' : 'text-gray-700'}">
                {session.title}
              </p>
              {#if session.speakers.length > 0}
                <p class="text-xs text-gray-400 truncate">{session.speakers.join(', ')}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/each}
</div>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no errors in `ScheduleSidebar.svelte`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/schedule/ScheduleSidebar.svelte
git commit -m "feat: add ScheduleSidebar with active time highlight and auto-scroll"
```

---

## Task 4: Add schedule tab to `[eventId]/+page.svelte`

**Files:**
- Modify: `src/routes/[eventId]/+page.svelte`

This task adds the 'schedule' view state, a Prenota/Programma tab nav, and renders `EventSchedule` in schedule view.

- [ ] **Step 1: Add the import and update the script section**

In `src/routes/[eventId]/+page.svelte`, add the import at the top of `<script>`:

```svelte
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { InterviewSlot } from '$lib/type/slots';
  import EventSchedule from '$lib/components/schedule/EventSchedule.svelte';  // ADD THIS

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Change the view type union to include 'schedule'
  let view = $state<'slots' | 'confirmed' | 'error' | 'form' | 'schedule'>(
    data.tokenInvalid ? 'error' : data.speaker ? 'slots' : 'form'
  );
  // ... rest of script unchanged
```

- [ ] **Step 2: Add tab nav and schedule view to the template**

In `src/routes/[eventId]/+page.svelte`, replace the outer wrapper div and add tab nav + schedule view. The outer div currently is:

```svelte
<div class="min-h-screen bg-gray-50 px-4 py-6 max-w-lg mx-auto space-y-4">
```

Change it to (wider to accommodate future sidebar):

```svelte
<div class="min-h-screen bg-gray-50 px-4 py-6 max-w-5xl mx-auto">
```

Then, as the first child inside that div (before the `{#if view === 'error'}` block), add the tab nav:

```svelte
  <!-- Tab nav: visible on all views except 'confirmed' -->
  {#if view !== 'confirmed'}
    <div class="flex gap-2 bg-white rounded-xl shadow p-1 mb-4 max-w-lg mx-auto">
      <button
        onclick={() => { if (view === 'schedule') view = data.speaker ? 'slots' : data.tokenInvalid ? 'error' : 'form'; }}
        class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
          {view !== 'schedule' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
      >
        Prenota
      </button>
      <button
        onclick={() => { view = 'schedule'; }}
        class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
          {view === 'schedule' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
      >
        Programma
      </button>
    </div>
  {/if}
```

Then wrap the error/form/confirmed/slots blocks with `<div class="space-y-4 max-w-lg mx-auto">` and `</div>` (this keeps them centered and narrow). After the closing `{/if}` of the main view conditional, add the schedule view:

```svelte
  {#if view === 'error'}
    <!-- ... existing content unchanged ... -->
  {:else if view === 'confirmed'}
    <!-- ... existing content unchanged ... -->
  {:else if view === 'form'}
    <!-- ... existing content unchanged ... -->
  {:else if view === 'slots'}
    <!-- ... existing content unchanged ... -->
  {:else if view === 'schedule'}
    <div class="bg-white rounded-xl shadow p-4 max-w-lg mx-auto">
      <EventSchedule highlightSpeakerName={data.speaker?.name ?? ''} />
    </div>
  {/if}
```

Note: the error/form/confirmed views already call `{@render scheduleOverview()}` which shows the interview slot overview — leave those unchanged. The new 'schedule' view shows the event program (talks).

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: no TS errors.

- [ ] **Step 4: Manual smoke test**

Open the app at `http://localhost:5173/azure-vicenza` (or with a valid token). Verify:
- Tab nav "Prenota / Programma" is visible
- Clicking "Programma" shows the event schedule list
- Clicking "Prenota" returns to the previous view
- Speaker highlight works when accessed with a valid token (`/azure-vicenza?token=...`)

- [ ] **Step 5: Commit**

```bash
git add src/routes/[eventId]/+page.svelte
git commit -m "feat: add Programma tab to speaker booking page with EventSchedule view"
```

---

## Task 5: Add talks-in-slot and ScheduleSidebar to `[eventId]/+page.svelte`

**Files:**
- Modify: `src/routes/[eventId]/+page.svelte`

- [ ] **Step 1: Add ScheduleSidebar import and getTalksAtTime import**

In the `<script>` section, add:

```svelte
  import ScheduleSidebar from '$lib/components/schedule/ScheduleSidebar.svelte';
  import { getTalksAtTime } from '$lib/config/schedule';
```

- [ ] **Step 2: Add talks-in-slot inside the `slotRow` snippet**

Find the `slotRow` snippet, inside the `{#if interactive}` branch, after the outer `<button>` closing tag (after `</button>`) — actually, **inside** the button, after the existing content. The button currently ends with:

```svelte
      <div class="flex items-center justify-between">
        <span ...>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</span>
        <span ...>{isMe ? '✓ Il tuo slot' : ...}</span>
      </div>
    </button>
```

Add a talks section **inside** the button div, after the `flex items-center justify-between` div:

```svelte
      <div class="flex items-center justify-between">
        ...existing content...
      </div>
      {#if available || isMe}
        {@const talks = getTalksAtTime(slot.startTime)}
        {#if talks.length > 0}
          <div class="mt-1.5 flex flex-wrap gap-1">
            {#each talks as talk (talk.id)}
              <span class="text-xs px-1.5 py-0.5 rounded-full
                {data.speaker?.name && talk.speakers.some(s => s.toLowerCase().includes(data.speaker!.name.toLowerCase()))
                  ? 'bg-amber-100 text-amber-700 font-semibold'
                  : 'bg-gray-100 text-gray-500'}">
                {talk.room}: {talk.speakers.length > 0 ? talk.speakers[0] : talk.title.slice(0, 30)}
              </span>
            {/each}
          </div>
        {/if}
      {/if}
```

- [ ] **Step 3: Add ScheduleSidebar inside the `{:else if view === 'slots'}` block**

Find the `{:else if view === 'slots'}` block. It currently starts with:
```svelte
  {:else if view === 'slots'}
    <div class="space-y-4">
```

Replace that wrapping div with a two-column layout on desktop:

```svelte
  {:else if view === 'slots'}
    <div class="md:grid md:grid-cols-[1fr_280px] md:gap-6">
      <!-- Left column: slot list -->
      <div class="space-y-4">
        <!-- ... all existing slot list content unchanged ... -->
      </div>
      <!-- Right column: sidebar (desktop only) -->
      <div class="hidden md:block">
        <div class="bg-white rounded-xl shadow p-3 sticky top-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <ScheduleSidebar
            activeSlotTime={selectedSlot?.startTime}
            highlightSpeakerName={data.speaker?.name ?? ''}
          />
        </div>
      </div>
    </div>
```

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: no TS errors.

- [ ] **Step 5: Manual smoke test**

Open `http://localhost:5173/azure-vicenza?token=<valid-token>` on a desktop browser (width > 768px). Verify:
- Sidebar is visible on the right showing the program
- When a slot is selected, the corresponding time block in the sidebar gets highlighted with indigo border and auto-scrolls into view
- Each slot card shows pill badges with talks happening at that time
- Speaker's talk badge is highlighted in amber
- On mobile (< 768px), sidebar is hidden; Programma tab shows full schedule

- [ ] **Step 6: Commit**

```bash
git add src/routes/[eventId]/+page.svelte
git commit -m "feat: add talks-in-slot badges and ScheduleSidebar to booking page"
```

---

## Task 6: Admin schedule page + nav link

**Files:**
- Create: `src/routes/admin/schedule/+page.svelte`
- Modify: `src/routes/admin/+layout.svelte`

- [ ] **Step 1: Create the admin schedule page**

```svelte
<!-- src/routes/admin/schedule/+page.svelte -->
<script lang="ts">
  import EventSchedule from '$lib/components/schedule/EventSchedule.svelte';
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h1 class="text-lg font-bold text-gray-900 mb-4">Programma — Global Azure Meetup Vicenza 2026</h1>
  <EventSchedule />
</div>
```

- [ ] **Step 2: Add "Programma" nav link in `admin/+layout.svelte`**

In `src/routes/admin/+layout.svelte`, find the nav section:

```svelte
      <a
        href="/admin/logout"
        class="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-600"
      >
        Logout
      </a>
```

Add before the Logout link:

```svelte
      <a
        href="/admin/schedule"
        class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors
          {$page.url.pathname === '/admin/schedule'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'}"
      >
        📅 Programma
      </a>
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Log in as admin, navigate to `/admin/azure-vicenza`. Verify:
- "📅 Programma" link appears in the header nav
- Clicking it navigates to `/admin/schedule`
- The page shows the full event schedule grouped by time
- Active nav state (indigo background) is applied correctly
- Navigating back to an event page removes the active state from the Programma link

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/schedule/+page.svelte src/routes/admin/+layout.svelte
git commit -m "feat: add admin schedule page and nav link"
```

---

## Self-Review Checklist

- [x] **`schedule.ts` data**: 38 sessioni estratte dall'HTML, tutti gli orari in UTC (+2h rispetto CEST)
- [x] **`EventSchedule`**: highlight speaker via `highlightSpeakerName`, service sessions come separatori grigi
- [x] **`ScheduleSidebar`**: auto-scroll su `activeTimeKey`, highlight blocco attivo, abbreviazioni room
- [x] **Tab Prenota/Programma**: aggiunta in `[eventId]/+page.svelte`, torna alla vista corretta (slots/error/form)
- [x] **Talks-in-slot**: badge con room + primo speaker, badge amber se talk dello speaker
- [x] **Sidebar 2-col**: nascosta su mobile, visibile su md+, sticky con max-h
- [x] **Admin**: `/admin/schedule` + link nav con active state
- [x] **Readonly (no token)**: la tab "Programma" è accessibile anche senza autenticazione — la route `[eventId]` è pubblica
- [x] **No Firestore changes**: tutti i dati sono statici

---

**Piano completo salvato in `docs/superpowers/plans/2026-04-13-event-schedule.md`.**

**Due opzioni di esecuzione:**

**1. Subagent-Driven (raccomandato)** — subagent separato per task, review tra un task e il successivo, iterazione rapida

**2. Inline Execution** — esecuzione nella sessione corrente con executing-plans, checkpoint di review a batch

Quale preferisci?
