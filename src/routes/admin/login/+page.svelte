<script lang="ts">
  import type { ActionData } from './$types';

  const { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Bacarotech Admin</h1>
    <p class="text-sm text-gray-500 mb-6">Accesso riservato</p>

    <form method="POST" class="space-y-4">
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {#if form?.error}
        <p class="text-sm text-red-600">{form.error}</p>
      {/if}

      <button
        type="submit"
        class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Accedi
      </button>
    </form>
  </div>
</div>
