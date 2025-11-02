<script>
  import BroadcastSender from "$lib/components/admin/BroadcastSender.svelte";
  import CalendarInterview from "$lib/components/slots/CalendarInterview.svelte";
</script>

<div class="w-full flex flex-col gap-5 items-center px-2">
  <h1 class="">Admin Page</h1>

  <div class="flex gap-2 flex-wrap">
    <a
      class="rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      href="/app/admin/slots">Modifica Slot</a
    >
    <a
      class="rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      href="/app/admin/notification">Comunicazioni</a
    >
  </div>

  <h1 class="">Lista Slot</h1>
  <div class="w-full">
    <CalendarInterview />
  </div>
</div>
