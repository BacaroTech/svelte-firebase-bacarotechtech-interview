<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { InterviewSlot } from '$lib/type/slots';

  const { data, form }: { data: PageData; form: ActionData } = $props();

  let selectedSlot = $state<InterviewSlot | null>(null);
  let view = $state<'slots' | 'confirmed' | 'error' | 'form'>(
    data.tokenInvalid ? 'error' : data.speaker ? 'slots' : 'form'
  );
  let bookingError = $state('');
  let isBooking = $state(false);

  // Slot già prenotato da questo speaker
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
      <h1 class="text-lg font-bold text-gray-900 mb-2">Link non valido o mancante</h1>
      <p class="text-gray-500 text-sm">
        Hai bisogno del tuo link personale per prenotare uno slot.<br />
        Contatta Michele su Telegram per riceverlo.
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
          <p class="text-sm text-gray-600 mt-1">Benvenuto 👋</p>
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
