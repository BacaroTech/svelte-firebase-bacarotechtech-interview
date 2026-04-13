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
      {#if slots.length === 0}
        <p class="text-sm text-gray-400 text-center py-4">Nessuno slot ancora. Esegui il seed script.</p>
      {/if}
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
