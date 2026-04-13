<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { InterviewSlot } from '$lib/type/slots';
  import EventSchedule from '$lib/components/schedule/EventSchedule.svelte';
  import ScheduleSidebar from '$lib/components/schedule/ScheduleSidebar.svelte';
  import { getTalksAtTime } from '$lib/config/schedule';
  import { browser } from '$app/environment';
  import { collection, onSnapshot, query, where } from 'firebase/firestore';
  import { dbClient } from '$lib/firebase/firebase.client';

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Inizializzato dai dati SSR, poi aggiornato in real-time da Firestore
  let slots = $state<InterviewSlot[]>(data.slots);

  $effect(() => {
    if (!browser || !dbClient) return;
    const q = query(
      collection(dbClient, 'slots'),
      where('eventId', '==', data.eventId)
    );
    const unsubscribe = onSnapshot(q, snapshot => {
      slots = snapshot.docs
        .map(doc => ({ ...doc.data(), docId: doc.id } as InterviewSlot))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });
    return unsubscribe;
  });

  let selectedSlot = $state<InterviewSlot | null>(null);
  let view = $state<'slots' | 'confirmed' | 'error' | 'form' | 'schedule'>(
    data.tokenInvalid ? 'error' : data.speaker ? 'slots' : 'form'
  );
  let bookingError = $state('');
  let isBooking = $state(false);

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
          {isMe ? '✓ Il tuo slot' : available ? (preferred ? '★ Preferenza' : 'Libero') : (slot.speakerName ?? 'Occupato')}
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
      <h1 class="text-lg font-bold text-gray-900 mb-1">{data.eventConfig.name}</h1>
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
    {@render scheduleOverview()}

  <!-- FORM: nessun token, accedi con email -->
  {:else if view === 'form'}
    <div class="bg-white rounded-xl shadow p-6">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">{data.eventConfig.dayLabel}</p>
      <h1 class="text-lg font-bold text-gray-900 mb-1">{data.eventConfig.name}</h1>
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

  <!-- SLOTS: lista slot interattivi (speaker autenticato) -->
  {:else if view === 'slots'}
    <div class="md:grid md:grid-cols-[1fr_280px] md:gap-6">
      <!-- Left column: slot list -->
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
        {/if}
      </div>

      {#if myBookedSlot}
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p class="text-green-700 font-semibold">
            ✅ Sei già prenotato per le {formatTime(myBookedSlot.startTime)}
          </p>
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
