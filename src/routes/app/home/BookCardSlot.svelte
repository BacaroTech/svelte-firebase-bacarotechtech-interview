<script lang="ts">
  import { app } from "$lib/firebase/firebase.client";
  import type { InterviewSlot } from "$lib/type/slots";
  import { getAuth } from "firebase/auth";

  const { slot, onsuccess }: { slot: InterviewSlot, onsuccess?: () => void } = $props();
  async function book() {
    try {

        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        if (currentUser) {
        
        const response = await fetch("/api/slots/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slotId: slot.docId}),
      });

      if (response.ok) {
        if (onsuccess) {
          onsuccess()
        }
      }
    }
    } catch (error) {
      console.error(error)
    }
  }
</script>

<div
  class="bg-white rounded-lg shadow p-4 mb-1 flex items-center justify-between border border-gray-200
min-w-90
"
>
  <div class="flex items-center">
    <div
      class="w-fit h-10 px-2 flex items-center justify-center bg-indigo-100 text-primary-700 rounded-full font-bold text-sm"
    >
      {new Date(slot.startTime).toLocaleTimeString()} - {new Date(
        slot.endTime
      ).toLocaleTimeString()}
    </div>
    <div class="ml-4">
      <p class="text-gray-900 font-medium">{slot.speakerName ?? "free"}</p>
      <!-- <p class="text-gray-500 text-sm">Details</p> -->
    </div>
    <div class="ml-4">
      <button
        onclick={() => book()}
        type="button"
        class="rounded-sm bg-primary-600 px-2 py-1 text-xs font-semibold text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        Book
      </button>
    </div>
  </div>
</div>
