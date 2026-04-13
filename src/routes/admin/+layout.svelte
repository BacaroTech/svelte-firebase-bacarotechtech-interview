<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  const { children }: { children: Snippet } = $props();

  const events = [
    { id: 'azure-vicenza', label: 'Azure Vicenza', emoji: '☁️' },
    { id: 'gdg-pisa', label: 'GDG Pisa', emoji: '🐍' }
  ];
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <span class="font-bold text-gray-900">Bacarotech Admin</span>
    <nav class="flex gap-2">
      {#each events as event}
        <a
          href="/admin/{event.id}"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            {$page.params.eventId === event.id
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'}"
        >
          {event.emoji} {event.label}
        </a>
      {/each}
      <a
        href="/admin/login"
        class="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-600"
      >
        Logout
      </a>
    </nav>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-6">
    {@render children()}
  </main>
</div>
