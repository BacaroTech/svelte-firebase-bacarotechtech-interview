<!-- src/lib/components/schedule/ScheduleSidebar.svelte -->
<script lang="ts">
  import { SESSIONS, type TalkSession } from '$lib/config/schedule';

  // Pre-computed numeric timestamps per group — avoids repeated Date parsing inside $derived
  type GroupEntry = { key: string; sessions: TalkSession[]; items: { session: TalkSession; startMs: number; endMs: number }[] };
  const groupedMs: GroupEntry[] = (() => {
    const map = new Map<string, TalkSession[]>();
    for (const s of SESSIONS) {
      if (!map.has(s.startTime)) map.set(s.startTime, []);
      map.get(s.startTime)!.push(s);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, sessions]) => ({
        key,
        sessions,
        items: sessions.map(s => ({
          session: s,
          startMs: new Date(s.startTime).getTime(),
          endMs:   new Date(s.endTime).getTime(),
        })),
      }));
  })();

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

  // Flat [key, sessions] pairs for template iteration
  const grouped = groupedMs.map(({ key, sessions }) => [key, sessions] as [string, TalkSession[]]);

  // Finds which time-group the active slot belongs to — no Date parsing at call time
  const activeTimeKey = $derived((() => {
    if (!activeSlotTime) return null;
    const t = new Date(activeSlotTime).getTime();
    if (isNaN(t)) return null;
    for (const { key, items } of groupedMs) {
      if (items.some(({ session, startMs, endMs }) =>
        !session.isService && startMs <= t && t < endMs
      )) return key;
    }
    return null;
  })());

  // $state so Svelte tracks bind:this assignments and $effect re-runs when refs are populated
  let blockEls: Record<string, HTMLElement | undefined> = $state({});

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
