<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { InterviewSlot, Speaker } from '$lib/type/slots';
  import { browser } from '$app/environment';
  import { collection, onSnapshot, query, where } from 'firebase/firestore';
  import { dbClient } from '$lib/firebase/firebase.client';

  const { data, form }: { data: PageData; form: ActionData } = $props();

  function toIso(v: any): string {
    if (typeof v === 'string') return v;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return new Date(v).toISOString();
  }

  function normalizeSlot(doc: any): InterviewSlot {
    return { ...doc, startTime: toIso(doc.startTime), endTime: toIso(doc.endTime) };
  }

  let slots = $state(data.slots.map(normalizeSlot));
  let speakers = $state(data.speakers);
  let changeRequests = $state<any[]>(data.changeRequests ?? []);

  // Sincronizza quando si naviga tra eventi (data cambia, $state no)
  $effect(() => {
    slots = data.slots.map(normalizeSlot);
    speakers = data.speakers;
    changeRequests = data.changeRequests ?? [];
  });

  $effect(() => {
    if (!browser || !dbClient) return;
    const q = query(collection(dbClient, 'slots'), where('eventId', '==', data.eventId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[onSnapshot] admin fired, docs:', snapshot.docs.length);
        slots = snapshot.docs
          .map(doc => normalizeSlot({ ...doc.data(), docId: doc.id }))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      },
      (err) => console.error('[onSnapshot] admin slots:', err)
    );
    return unsubscribe;
  });

  $effect(() => {
    if (!browser || !dbClient) return;
    const q = query(collection(dbClient, 'change_requests'), where('eventId', '==', data.eventId));
    let initialized = false;
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const incoming = snapshot.docs
          .map(doc => ({ ...doc.data(), docId: doc.id }))
          .sort((a: any, b: any) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

        // Notifica browser per le nuove richieste (non al primo caricamento)
        if (initialized) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const cr = change.doc.data();
              if (Notification.permission === 'granted') {
                const ora1 = new Date(cr.currentSlotTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                const ora2 = new Date(cr.requestedSlotTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                new Notification('🔄 Richiesta cambio slot', {
                  body: `${cr.speakerName}: ${ora1} → ${ora2}${cr.note ? ` — "${cr.note}"` : ''}`,
                  icon: '/icons/512.png'
                });
              }
            }
          });
        }
        initialized = true;
        changeRequests = incoming;
      },
      (err) => console.error('[onSnapshot] admin change_requests:', err)
    );
    return unsubscribe;
  });
  let showAddForm = $state(false);

  // Form aggiungi speaker
  let newName = $state('');
  let newEmail = $state('');
  let newTalk = $state('');
  let newNotes = $state('');
  let newLink = $state('');
  let addError = $state('');
  let isAdding = $state(false);
  let isReseeding = $state(false);
  let isTestingNotification = $state(false);
  let testNotifResult = $state('');

  async function sendTestNotification() {
    const token = localStorage.getItem('fcm_token');
    if (!token) {
      testNotifResult = '❌ Nessun token FCM in localStorage — abilita prima le notifiche (campanella)';
      return;
    }
    isTestingNotification = true;
    testNotifResult = '';
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email: 'scarpa.michele.90@gmail.com' })
    });
    const data = await res.json();
    testNotifResult = res.ok ? '✅ ' + data.message : '❌ ' + data.error;
    isTestingNotification = false;
  }

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
    return `${data.baseUrl}/${data.eventId}?token=${speaker.token}`;
  }

  async function copyLink(speaker: Speaker) {
    await navigator.clipboard.writeText(linkForSpeaker(speaker));
  }

  function buildInviteMailto(speaker: Speaker): string {
    const link = linkForSpeaker(speaker);

    const subject = `Intervista video Bacarotech — ${data.eventConfig.name}, ${data.eventConfig.dayLabel}`;

    // ── Modifica qui il testo dell'email di invito ──────────────────────────
    const lines = [
      `Ciao ${speaker.name},`,
      ``,
      `sono Michele di Bacarotech, una community di sviluppatori attiva come media partner per eventi tech (Azure meetup, GDG DevFest, PyData, ...).`,
      ``,
      `Come anticipato nella mail di gruppo, ${data.eventConfig.dayLabel} sarò al ${data.eventConfig.name} per realizzare un vlog e delle brevi interviste agli speaker.`,
      `L'idea è semplice: creare uno specchietto dell'evento per chi non c'era, dare visibilità a voi speaker e supportare gli organizzatori.`,
      ``,
      `Si tratta di 5-7 minuti, in modo informale e senza copione.`,
      `Parleremo del tuo talk, delle tue esperienze e di quello che vuoi condividere con la community.`,
      ``,
      `L'intervista verrà pubblicata sul canale YouTube di Bacarotech e in un trailer sui nostri social (LinkedIn, Instagram, TikTok), con tutti i link necessari per dare risonanza social.`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Per scegliere il tuo slot orario, clicca qui:`,
      `👉 ${link}`,
      `Il link è personale, non serve registrazione.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Salvati questa email così potrai recuperare il link; oppure salvati il mio contatto così se hai bisogno te la reinvio.`,
      ``,
      `Per qualsiasi dubbio:`,
      `→ Rispondi a questa email`,
      `→ Telegram: @michele_scarpa`,
      `→ WhatsApp: 348 348 2541`,
      ``,
      `A ${data.eventConfig.dayLabel.split(' ')[0]}!`,
      `Michele`,
      ``,
      `Bacarotech — https://bacarotech.github.io/`,
      `LinkedIn: https://www.linkedin.com/in/michele-scarpa-90-arco/`,
    ];
    // ───────────────────────────────────────────────────────────────────────

    // mailto richiede CRLF per i ritorni a capo
    const body = lines.join('\r\n');
    return `mailto:${encodeURIComponent(speaker.email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function approveChangeRequest(crId: string) {
    const res = await fetch(`/api/change-requests/${crId}/approve`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? 'Errore durante l\'approvazione');
    }
    // onSnapshot aggiornerà automaticamente changeRequests
  }

  async function dismissChangeRequest(crId: string) {
    const res = await fetch(`/api/change-requests/${crId}/dismiss`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? 'Errore durante la chiusura');
    }
  }

  async function regenerateToken(speaker: Speaker) {
    if (!confirm(`Rigenera il token per ${speaker.name}? Il link precedente diventerà invalido.`)) return;
    const res = await fetch(`/api/speaker/${speaker.docId}/regenerate`, { method: 'POST' });
    if (res.ok) {
      const { token } = await res.json();
      speakers = speakers.map(s => s.docId === speaker.docId ? { ...s, token, activatedAt: null } : s);
    }
  }

  function formatActivatedAt(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  async function updateSlotStatus(slotId: string, status: string) {
    const res = await fetch(`/api/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      slots = slots.map(s => s.docId === slotId ? { ...s, status: status as any } : s);
      // Se si libera lo slot, resetta anche lo speaker associato nello stato locale
      if (status === 'AVAILABLE') {
        slots = slots.map(s => s.docId === slotId ? { ...s, speakerUid: null, speakerName: null } : s);
      }
    }
  }

  async function bookSlotForSpeaker(slotId: string, speakerUid: string) {
    if (!speakerUid) return;
    const res = await fetch(`/api/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'BOOKED', speakerUid })
    });
    if (res.ok) {
      const speaker = speakers.find(s => s.docId === speakerUid);
      slots = slots.map(s => s.docId === slotId
        ? { ...s, status: 'BOOKED' as any, speakerUid, speakerName: speaker?.name ?? null }
        : s
      );
    } else {
      const err = await res.json();
      alert(err.error ?? 'Errore durante il booking');
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
        status: 'pending',
        activatedAt: null
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
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
          <span class="text-sm font-mono text-gray-700 min-w-28">
            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
          </span>
          <!-- Selettore speaker per booking manuale -->
          <select
            value={slot.speakerUid ?? ''}
            onchange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              if (val) bookSlotForSpeaker(slot.docId, val);
              else updateSlotStatus(slot.docId, 'AVAILABLE');
            }}
            class="text-sm rounded-md border border-gray-200 px-2 py-1 flex-1 min-w-0 truncate"
          >
            <option value="">— nessuno —</option>
            {#each speakers as sp (sp.docId)}
              <option value={sp.docId}>{sp.name}</option>
            {/each}
          </select>
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
        <div class="flex flex-col gap-1 p-3 rounded-lg border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{speaker.name}</p>
              {#if speaker.talk}
                <p class="text-xs text-gray-400 truncate">{speaker.talk}</p>
              {/if}
            </div>
            <span class="text-xs text-gray-500 min-w-16">
              {bookedSlot ? formatTime(bookedSlot.startTime) : '—'}
            </span>
            <!-- Stato token -->
            {#if speaker.activatedAt}
              <span class="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 whitespace-nowrap" title="Primo accesso: {formatActivatedAt(speaker.activatedAt)}">
                ✅ Usato {formatActivatedAt(speaker.activatedAt)}
              </span>
            {:else}
              <span class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 whitespace-nowrap">
                ⏳ Non usato
              </span>
            {/if}
            <button
              onclick={() => copyLink(speaker)}
              class="text-xs text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
            >
              📋 Link
            </button>
            {#if speaker.email}
              <a
                href={buildInviteMailto(speaker)}
                class="text-xs text-green-700 hover:text-green-600 whitespace-nowrap"
                title="Apri bozza email di invito"
              >
                ✉️ Invita
              </a>
            {/if}
            <button
              onclick={() => regenerateToken(speaker)}
              class="text-xs text-orange-600 hover:text-orange-500 whitespace-nowrap"
              title="Genera nuovo token — il link precedente diventa invalido"
            >
              ⟳ Rigenera
            </button>
          </div>
        </div>
      {/each}
      {#if speakers.length === 0}
        <p class="text-sm text-gray-400 text-center py-4">Nessuno speaker ancora. Aggiungine uno!</p>
      {/if}
    </div>
  </section>

  <!-- STORICO RICHIESTE CAMBIO SLOT -->
  <section class="bg-white rounded-xl shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-gray-900">Richieste cambio slot</h2>
      {#if changeRequests.filter((r: any) => r.status === 'pending').length > 0}
        <span class="text-xs font-semibold bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
          {changeRequests.filter((r: any) => r.status === 'pending').length} in attesa
        </span>
      {/if}
    </div>
    {#if changeRequests.length === 0}
      <p class="text-sm text-gray-400 text-center py-4">Nessuna richiesta ancora.</p>
    {:else}
      <div class="space-y-2">
        {#each changeRequests as cr (cr.docId)}
          {@const ora1 = new Date(cr.currentSlotTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          {@const ora2 = cr.requestedSlotTime ? new Date(cr.requestedSlotTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null}
          {@const when = new Date(cr.createdAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {@const isRelease = cr.type === 'release'}
          <div class="rounded-lg border p-3 {cr.status === 'pending' ? (isRelease ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50') : 'border-gray-100 bg-gray-50'}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">
                  {cr.speakerName}
                  {#if isRelease}
                    <span class="text-red-600 font-normal ml-1">vuole liberare le {ora1}</span>
                  {:else}
                    <span class="font-semibold text-orange-700 ml-1">{ora1} → {ora2}</span>
                  {/if}
                </p>
                {#if cr.note}
                  <p class="text-xs text-gray-500 mt-0.5">"{cr.note}"</p>
                {/if}
                <p class="text-xs text-gray-400 mt-0.5">{when}</p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="text-xs rounded-full px-2 py-0.5 whitespace-nowrap
                  {cr.status === 'pending' ? (isRelease ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700') : 'bg-gray-100 text-gray-400'}">
                  {cr.status === 'pending' ? '⏳ In attesa' : cr.status === 'approved' ? '✅ Eseguita' : '🚫 Chiusa'}
                </span>
                {#if cr.status === 'pending'}
                  <div class="flex gap-1 mt-1">
                    <button
                      onclick={() => approveChangeRequest(cr.docId)}
                      class="text-xs rounded px-2 py-1 bg-green-600 text-white hover:bg-green-500 whitespace-nowrap"
                    >
                      {isRelease ? '📤 Libera' : '↔ Effettua'}
                    </button>
                    <button
                      onclick={() => dismissChangeRequest(cr.docId)}
                      class="text-xs rounded px-2 py-1 bg-gray-200 text-gray-600 hover:bg-gray-300 whitespace-nowrap"
                    >
                      Chiudi
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- TEST NOTIFICA -->
  <section class="bg-white rounded-xl shadow p-4 border border-blue-100">
    <h2 class="text-base font-semibold text-gray-900 mb-1">Test notifica push</h2>
    <p class="text-sm text-gray-500 mb-3">
      Invia una notifica di test al tuo browser. Assicurati di aver abilitato le notifiche (campanella in alto).
    </p>
    {#if testNotifResult}
      <p class="text-sm mb-3 {testNotifResult.startsWith('✅') ? 'text-green-700' : 'text-red-600'}">{testNotifResult}</p>
    {/if}
    <button
      type="button"
      onclick={sendTestNotification}
      disabled={isTestingNotification}
      class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {isTestingNotification ? 'Invio...' : '🔔 Invia notifica di test'}
    </button>
  </section>

  <!-- RESEED SPEAKER -->
  <section class="bg-white rounded-xl shadow p-4 border border-orange-100">
    <h2 class="text-base font-semibold text-gray-900 mb-1">Reset speaker da stato.json</h2>
    <p class="text-sm text-gray-500 mb-3">
      Cancella tutti gli speaker dell'evento e li ricrea da <code class="bg-gray-100 px-1 rounded text-xs">doc/stato.json</code>
      con token freschi. I link precedenti diventano invalidi.
    </p>

    {#if form?.seedError}
      <p class="text-sm text-red-600 mb-3">{form.seedError}</p>
    {/if}

    {#if form?.seedLinks}
      <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
        <p class="text-xs font-semibold text-green-800 mb-2">✅ {form.seedCount} speaker ricreati — nuovi link:</p>
        <div class="space-y-1 max-h-64 overflow-y-auto">
          {#each form.seedLinks as { nome, link }}
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-700 min-w-40 truncate">{nome}</span>
              <button
                onclick={() => navigator.clipboard.writeText(link)}
                class="text-xs text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
              >📋 Copia</button>
              <span class="text-xs text-gray-400 font-mono truncate">{link.split('token=')[1]?.slice(0,8)}…</span>
            </div>
          {/each}
        </div>
        <button
          onclick={() => {
            const text = form.seedLinks.map(({ nome, link }: { nome: string; link: string }) => `${nome}\t${link}`).join('\n');
            navigator.clipboard.writeText(text);
          }}
          class="mt-2 text-xs text-indigo-600 underline"
        >
          Copia tutti come testo
        </button>
      </div>
    {/if}

    <form method="POST" action="?/reseedSpeakers"
      onsubmit={(e) => { if (!confirm('Sei sicuro? Tutti i link esistenti diventeranno invalidi.')) e.preventDefault(); else isReseeding = true; }}>
      <button
        type="submit"
        disabled={isReseeding}
        class="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
      >
        {isReseeding ? 'Reset in corso...' : '⟳ Reset e ricarica speaker'}
      </button>
    </form>
  </section>
</div>
