<script lang="ts">
  import type { InterviewSlot } from "$lib/type/slots";

    const { slot }: { slot: InterviewSlot} = $props();
</script>

<div class="bg-white rounded-lg shadow p-4 mb-1 flex items-center justify-between border border-gray-200
min-w-90
">
  <div class="flex items-center">
    <div class="w-fit h-10 px-2 flex items-center justify-center bg-indigo-100 text-primary-700 rounded-full font-bold text-sm">
      {new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}
    </div>
    <div class="ml-4">
      <p class="text-gray-900 font-medium">{slot.speakerName ?? 'free'}</p>
      <!-- <p class="text-gray-500 text-sm">Details</p> -->
    </div>
  </div>
  
 
</div>
