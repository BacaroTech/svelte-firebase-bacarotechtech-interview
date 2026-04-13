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
