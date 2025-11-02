<script lang="ts">
  import icon from "$lib/assets/icon.png";
  import Logout from "../auth/Logout.svelte";
  import InterviewNotification from "../notification/InterviewNotification.svelte";
  import { userState } from "$lib/store/userstore.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  const pathname = $derived(page.url.pathname)
  const isHome = $derived(pathname === '/');
  
  function back() {
    goto("../");
  }

</script>

<header class="bg-primary-600">
  <nav
    aria-label="Global"
    class="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
  >
    <div class="flex lg:flex-1">
      <img src={icon} alt="bacaroicon" class="h-10 w-auto" />
    </div>

    {#if !isHome}
      <button
        class=" rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        onclick={back}
        aria-label="back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
      </button>
    {/if}

    <span class="ml-2 text-secondary-400 text-xl">Bacaro Interview</span>

    <InterviewNotification />

    {#if userState.loggedin}
      <Logout />
    {:else}
      <a
        href="/login"
        class="rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        Login
      </a>
    {/if}
  </nav>
</header>
