<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { InterviewSlot } from '$lib/type/slots';
  import EventSchedule from '$lib/components/schedule/EventSchedule.svelte';
  import ScheduleSidebar from '$lib/components/schedule/ScheduleSidebar.svelte';
  import { getTalksAtTime } from '$lib/config/schedule';
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';
  import { collection, onSnapshot, query, where } from 'firebase/firestore';
  import { dbClient } from '$lib/firebase/firebase.client';
  import icon from '$lib/assets/icon.png';
  import InterviewNotification from '$lib/components/notification/InterviewNotification.svelte';

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Converte qualsiasi formato Timestamp in ISO string:
  // - Firestore Client SDK Timestamp (da onSnapshot)    → .toDate()
  // - Plain object { seconds, nanoseconds } (da devalue/SSR) → seconds * 1000
  // - Già stringa ISO                                   → pass-through
  function toIso(v: any): string {
    if (typeof v === 'string') return v;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return new Date(v).toISOString();
  }

  function normalizeSlot(doc: any): InterviewSlot {
    return { ...doc, startTime: toIso(doc.startTime), endTime: toIso(doc.endTime) };
  }

  // Inizializzato dai dati SSR (Timestamps serializzati come { seconds, nanoseconds })
  let slots = $state<InterviewSlot[]>(data.slots.map(normalizeSlot));

  $effect(() => {
    if (!browser || !dbClient) return;
    const q = query(
      collection(dbClient, 'slots'),
      where('eventId', '==', data.eventId)
    );
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        console.log('[onSnapshot] fired, docs:', snapshot.docs.length);
        isLive = true;
        slots = snapshot.docs
          .map(doc => normalizeSlot({ ...doc.data(), docId: doc.id }))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      },
      err => {
        console.error('[onSnapshot] errore:', err.code, err.message);
      }
    );
    return unsubscribe;
  });

  let selectedSlot = $state<InterviewSlot | null>(null);
  let view = $state<'slots' | 'confirmed' | 'error' | 'form' | 'schedule'>(
    data.tokenInvalid ? 'error' : data.speaker ? 'slots' : 'form'
  );
  let bookingError = $state('');
  let isBooking = $state(false);
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
    const token = data.speaker?.token ?? '';
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

  let isLive = $state(false);
  let isRefreshing = $state(false);

  async function refreshSlots() {
    isRefreshing = true;
    await invalidateAll();
    isRefreshing = false;
  }
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

  // Easter egg per admin: 5 click sul titolo in 2 secondi
  let clickCount = $state(0);
  let lastClickTime = $state(0);
  function handleAdminClick() {
    const now = Date.now();
    if (now - lastClickTime < 2000) {
      clickCount++;
    } else {
      clickCount = 1;
    }
    lastClickTime = now;
    if (clickCount >= 5) {
      window.location.href = '/admin/login';
    }
  }

  const myBookedSlot = $derived(
    data.speaker
      ? slots.find(s => s.speakerUid === data.speaker!.docId) ?? null
      : null
  );

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function isPreferred(slot: InterviewSlot) {
    return data.speaker?.preferredSlots?.includes(slot.docId) ?? false;
  }

  // Raggruppa per ora locale: colazione <12, mattina 12-14, pomeriggio >=14
  function slotHour(slot: InterviewSlot) {
    return new Date(slot.startTime).getHours();
  }
  const colazioneSlots = $derived(slots.filter(s => slotHour(s) < 12));
  const morningSlots   = $derived(slots.filter(s => { const h = slotHour(s); return h >= 12 && h < 14; }));
  const afternoonSlots = $derived(slots.filter(s => slotHour(s) >= 14));

  async function book() {
    if (!selectedSlot) return;
    isBooking = true;
    bookingError = '';
    const token = data.speaker?.token ?? '';
    const res = await fetch('/api/slots/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: selectedSlot.docId, token })
    });
    if (res.ok) {
      view = 'confirmed';
    } else {
      const err = await res.json();
      const msg: string = err.error ?? 'Errore durante la prenotazione';
      bookingError = msg.includes('non è disponibile')
        ? 'Qualcuno ha appena prenotato questo slot 😅 Scegline un altro 👇'
        : msg;
    }
    isBooking = false;
  }

  function toGCalDate(iso: string): string {
    const d = new Date(iso);
    return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  }

  function buildGCalUrl(slot: InterviewSlot): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Intervista Bacarotech — Global Azure Veneto 2026',
      details: 'Chiacchierata free-style con Michele di Bacarotech. 5-7 minuti, senza copione.',
      location: 'Area divanetti, vicino alla reception — cerca la DJI Action su cavalletto',
      add: 'scarpa.michele.90@gmail.com'
    });
    // dates contiene '/' che non deve essere codificato da URLSearchParams
    return `https://calendar.google.com/calendar/render?${params.toString()}&dates=${toGCalDate(slot.startTime)}/${toGCalDate(slot.endTime)}`;
  }

  function buildOutlookUrl(slot: InterviewSlot): string {
    const params = new URLSearchParams({
      subject: 'Intervista Bacarotech — Global Azure Veneto 2026',
      startdt: slot.startTime,
      enddt: slot.endTime,
      body: 'Chiacchierata free-style con Michele di Bacarotech. 5-7 minuti, senza copione.',
      location: 'Area divanetti, vicino alla reception — cerca la DJI Action su cavalletto',
      to: 'scarpa.michele.90@gmail.com'
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }
</script>

{#snippet slotRow(slot: InterviewSlot, interactive: boolean)}
  {@const available = slot.status === 'AVAILABLE'}
  {@const booked = slot.status === 'BOOKED' || slot.status === 'DONE'}
  {@const preferred = interactive && isPreferred(slot)}
  {@const selected = interactive && selectedSlot?.docId === slot.docId}
  {@const isMe = myBookedSlot?.docId === slot.docId}

  {#if interactive}
    <button
      disabled={!available}
      onclick={() => { selectedSlot = available ? slot : null; }}
      title={preferred ? 'Slot che hai indicato disponibile via email' : undefined}
      class="w-full text-left rounded-xl border p-3 transition-all
        {selected
          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300'
          : isMe
            ? 'border-green-400 bg-green-50'
            : available
              ? preferred
                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                : 'border-gray-200 bg-white hover:bg-gray-50'
              : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-900">
          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
        </span>
        <span class="text-xs px-2 py-0.5 rounded-full
          {isMe
            ? 'bg-green-100 text-green-700'
            : available
              ? preferred ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              : 'bg-gray-200 text-gray-400'}">
          {isMe ? '✓ Il tuo slot' : available ? (preferred ? '★ Disponibile' : 'Libero') : (slot.speakerName ?? 'Occupato')}
        </span>
      </div>
      {#if !!data.speaker}
        {@const talks = getTalksAtTime(slot.startTime)}
        {@const myNameLower = data.speaker.name.toLowerCase()}
        {#if talks.length > 0}
          <div class="mt-1.5 flex flex-wrap gap-1">
            {#each talks as talk (talk.id)}
              <span class="text-xs px-1.5 py-0.5 rounded-full
                {talk.speakers.some(s => s.toLowerCase().includes(myNameLower))
                  ? 'bg-amber-100 text-amber-700 font-semibold'
                  : 'bg-gray-100 text-gray-500'}">
                {talk.room}: {talk.speakers.length > 0 ? talk.speakers[0] : talk.title.slice(0, 30)}
              </span>
            {/each}
          </div>
        {/if}
      {/if}
    </button>
  {:else}
    <!-- Read-only row -->
    <div class="flex items-center justify-between rounded-lg border px-3 py-2
      {booked ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-white'}">
      <span class="text-sm font-mono text-gray-700">
        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
      </span>
      <span class="text-xs px-2 py-0.5 rounded-full
        {booked ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}">
        {booked ? (slot.speakerName ?? 'Occupato') : 'Libero'}
      </span>
    </div>
  {/if}
{/snippet}

{#snippet scheduleOverview()}
  <div class="bg-white rounded-xl shadow p-4 space-y-4">
    <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Programmazione interviste</h2>

    {#if colazioneSlots.length > 0}
    <div>
      <p class="text-xs text-gray-400 mb-2">☕ Colazione — 10:20 / 10:50</p>
      <div class="space-y-1.5">
        {#each colazioneSlots as slot (slot.docId)}
          {@render slotRow(slot, false)}
        {/each}
      </div>
    </div>
    {/if}

    <div>
      <p class="text-xs text-gray-400 mb-2">☀️ Mattina — 12:30 / 13:20</p>
      <div class="space-y-1.5">
        {#each morningSlots as slot (slot.docId)}
          {@render slotRow(slot, false)}
        {/each}
      </div>
    </div>

    <div>
      <p class="text-xs text-gray-400 mb-2">🌤 Pomeriggio — 14:50 / 15:40</p>
      <div class="space-y-1.5">
        {#each afternoonSlots as slot (slot.docId)}
          {@render slotRow(slot, false)}
        {/each}
      </div>
    </div>
  </div>
{/snippet}

{#snippet bacaroFooter()}
  <div class="mt-8 border-t border-gray-100 pt-4 pb-6 text-center">
    <div class="flex items-center justify-center gap-1.5 mb-1">
      <img src={icon} alt="Bacarotech" class="h-4 w-auto opacity-60" />
      <span class="text-xs text-gray-400 font-medium">Bacarotech</span>
    </div>
    <p class="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
      Bacarotech: La tua community di sviluppatori dove si parla di programmazione a 360°
    </p>
    <a href="https://bacarotech.github.io/" 
      target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
      Visita il sito
    </a>
  </div>
{/snippet}

<div class="min-h-screen bg-gray-50 px-4 py-6 max-w-5xl mx-auto">

  <!-- Tab nav: visible on all views except 'confirmed' -->
  {#if view !== 'confirmed'}
    <div role="tablist" class="flex gap-2 bg-white rounded-xl shadow p-1 mb-4 max-w-lg mx-auto">
      <button
        type="button"
        role="tab"
        aria-selected={view !== 'schedule'}
        onclick={() => { if (view === 'schedule') view = data.speaker ? 'slots' : data.tokenInvalid ? 'error' : 'form'; }}
        class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
          {view !== 'schedule' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
      >
        Prenota
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'schedule'}
        onclick={() => { view = 'schedule'; }}
        class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
          {view === 'schedule' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
      >
        Programma
      </button>
    </div>
  {/if}

  <div class="{view === 'schedule' || view === 'slots' ? 'w-full' : 'space-y-4 max-w-lg mx-auto'}">

  <!-- ERROR: token non valido — mostra form email per recupero -->
  {#if view === 'error'}
    <div class="bg-white rounded-xl shadow p-6">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{data.eventConfig.dayLabel}</p>
      <button
        type="button"
        onclick={handleAdminClick}
        class="text-left block w-full focus:outline-none"
      >
        <h1 class="text-lg font-bold text-gray-900 mb-1">{data.eventConfig.name}</h1>
      </button>
      <p class="text-sm text-amber-600 mb-4">Link non valido o scaduto — accedi con la tua email.</p>
      <form method="POST" action="?/emailLogin" class="space-y-3">
        <input
          type="email"
          name="email"
          placeholder="la-tua@email.it"
          required
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {#if form?.emailError}
          <p class="text-sm text-red-600">{form.emailError}</p>
        {/if}
        <button
          type="submit"
          class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Accedi
        </button>
      </form>
    </div>
    {@render scheduleOverview()}
    {@render bacaroFooter()}

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

      <!-- Add to calendar -->
      {#if selectedSlot}
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <a
            href={buildGCalUrl(selectedSlot)}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            📅 Google Calendar
          </a>
          <a
            href={buildOutlookUrl(selectedSlot)}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📅 Outlook
          </a>
        </div>
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

      <button
        type="button"
        onclick={() => { view = 'slots'; }}
        class="mt-4 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Vai alla tua prenotazione →
      </button>
    </div>
    {@render scheduleOverview()}
    {@render bacaroFooter()}

  <!-- FORM: nessun token, accedi con email -->
  {:else if view === 'form'}
    <div class="bg-white rounded-xl shadow p-6">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{data.eventConfig.dayLabel}</p>
      <button
        type="button"
        onclick={handleAdminClick}
        class="text-left block w-full focus:outline-none"
      >
        <h1 class="text-lg font-bold text-gray-900 mb-1">{data.eventConfig.name}</h1>
      </button>
      <p class="text-sm text-gray-500 mb-5">Inserisci l'email con cui ti sei registrato all'evento per accedere al tuo spazio.</p>
      <form method="POST" action="?/emailLogin" class="space-y-3">
        <input
          type="email"
          name="email"
          placeholder="la-tua@email.it"
          required
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {#if form?.emailError}
          <p class="text-sm text-red-600">{form.emailError}</p>
        {/if}
        <button
          type="submit"
          class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Accedi
        </button>
      </form>
    </div>
    {@render scheduleOverview()}
    {@render bacaroFooter()}

  <!-- SLOTS: lista slot interattivi (speaker autenticato) -->
  {:else if view === 'slots'}
    <div class="md:grid md:grid-cols-[1fr_280px] md:gap-6">
      <!-- Left column: slot list -->
      <div class="space-y-4">

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

      <!-- Header -->
      <div class="bg-white rounded-xl shadow p-4">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{data.eventConfig.dayLabel}</p>
        <button
          type="button"
          onclick={handleAdminClick}
          class="text-left block w-full focus:outline-none"
        >
          <h1 class="text-lg font-bold text-gray-900">{data.eventConfig.name}</h1>
        </button>
        {#if data.speaker}
          <div class="flex items-center justify-between mt-1">
            <p class="text-sm text-gray-600">Ciao <strong>{data.speaker.name}</strong> 👋</p>
            <div class="flex items-center gap-1">
              <InterviewNotification role="speaker" />
              <form method="POST" action="?/logout">
                <button
                  type="submit"
                  class="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xs"
                  title="Esci"
                >
                  ⎋
                </button>
              </form>
            </div>
          </div>
          {#if data.speaker.email}
            <p class="text-xs text-gray-400 mt-0.5">📧 {data.speaker.email}</p>
          {/if}
          {#if data.speaker.talk}
            <p class="text-xs text-gray-400 mt-0.5">"{data.speaker.talk}"</p>
          {/if}
          <div class="flex items-center gap-2 mt-1">
            <button
              type="button"
              onclick={refreshSlots}
              disabled={isRefreshing}
              class="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
              title="Aggiorna disponibilità"
            >
              <span class="{isRefreshing ? 'animate-spin' : ''}">↻</span>
              {isRefreshing ? 'Aggiornamento...' : 'Aggiorna'}
            </button>
            {#if isLive}
              <span class="flex items-center gap-1 text-xs text-green-500">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                live
              </span>
            {/if}
          </div>
        {/if}
      </div>

      {#if myBookedSlot}
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p class="text-green-700 font-semibold">
            ✅ Sei già prenotato per le {formatTime(myBookedSlot.startTime)}
          </p>

          <div class="flex flex-wrap justify-center gap-2 mt-3">
            <a
              href={buildGCalUrl(myBookedSlot)}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              📅 Google Calendar
            </a>
            <a
              href={buildOutlookUrl(myBookedSlot)}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              📅 Outlook
            </a>
          </div>

          <!-- Info logistiche sempre visibili -->
          <div class="mt-4 text-left rounded-lg border border-green-100 bg-white p-3 space-y-2">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">📍 Dove trovarmi</p>
              <p class="text-sm text-gray-700">Area divanetti vicino alla reception</p>
              <p class="text-xs text-gray-500">Cerca la DJI Action su cavalletto</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">📱 Imprevisti last-minute</p>
              <p class="text-sm text-gray-700">WhatsApp / Telegram: <span class="font-mono">@michele_scarpa · 348 348 2541</span></p>
            </div>
          </div>

          {#if changeRequestSent}
            <p class="text-sm text-gray-500 mt-2">
              ✅ Richiesta inviata a Michele. Ti risponderà su Telegram <strong>@michele_scarpa</strong>.
            </p>
          {:else if showChangeForm}
            <div class="mt-3 text-left space-y-2">
              <label for="change-slot-select" class="block text-xs text-gray-600 font-medium">Slot che preferiresti:</label>
              <select
                id="change-slot-select"
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

      <!-- Colazione -->
      {#if colazioneSlots.length > 0}
      <div>
        <p class="text-xs text-gray-400 px-1 mb-2">☕ Colazione — 10:20 / 10:50</p>
        <div class="space-y-2">
          {#each colazioneSlots as slot (slot.docId)}
            {@render slotRow(slot, true)}
          {/each}
        </div>
      </div>
      {/if}

      {#if !selectedSlot && !myBookedSlot}
        <p class="text-xs text-gray-400 px-1">
          💡 Usa il tab <strong>Programma</strong> per vedere il tuo talk e scegliere uno slot che non si sovrapponga alla tua sessione.
        </p>
      {/if}

      <!-- Mattina -->
      <div>
        <p class="text-xs text-gray-400 px-1 mb-2">☀️ Mattina — 12:30 / 13:20</p>
        <div class="space-y-2">
          {#each morningSlots as slot (slot.docId)}
            {@render slotRow(slot, true)}
          {/each}
        </div>
      </div>

      <!-- Pomeriggio -->
      <div>
        <p class="text-xs text-gray-400 px-1 mb-2">🌤 Pomeriggio — 14:50 / 15:40</p>
        <div class="space-y-2">
          {#each afternoonSlots as slot (slot.docId)}
            {@render slotRow(slot, true)}
          {/each}
        </div>
      </div>

      <p class="text-xs text-gray-400 px-1 mt-1">
        👥 I nomi degli altri speaker sono visibili: così potete organizzarvi autonomamente se avete esigenze di orario simili.
      </p>

      <!-- CTA conferma -->
      {#if selectedSlot && !myBookedSlot}
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

      {@render bacaroFooter()}
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

  {:else if view === 'schedule'}
    <div class="bg-white rounded-xl shadow p-4">
      <EventSchedule highlightSpeakerName={data.speaker?.name ?? ''} />
    </div>
  {/if}

  </div>
</div>
