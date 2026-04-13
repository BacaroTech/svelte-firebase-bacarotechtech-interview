<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/azure-vicenza');
  });
</script>

<p class="text-center text-gray-400 mt-20 text-sm">Caricamento...</p>
