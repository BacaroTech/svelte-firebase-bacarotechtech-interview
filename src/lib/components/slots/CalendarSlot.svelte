<script lang="ts">
  import type { InterviewSlot } from "$lib/type/slots";
  import { onMount } from "svelte";

  const { slots }: { slots: InterviewSlot[] } = $props();

  const calendarStartHour = 8;
  const calendarEndHour = 19;
  const hourHeightRem = 15; // Aumentiamo un po' per più spazio
  // Nuove configurazioni per la gestione degli eventi brevi
  const minEventHeightRem = 1.5; // Altezza minima fissa per un evento in rem (es. 1.5rem)
  const shortEventThresholdMinutes = 30; // Un evento è considerato "breve" se dura meno di X minuti

  // --- FUNZIONI HELPER ---
  /** Converte una data ISO in minuti totali dall'inizio della giornata (in UTC per coerenza) */
  function dateToMinutes(isoString: string): number {
    const date = new Date(isoString);
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  /** Formatta l'orario per la visualizzazione (es. 09:00) */
  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /** Restituisce la classe CSS corretta in base allo stato dello slot */
  function getStatusColor(status: InterviewSlot["status"]): string {
    switch (status) {
      case "BOOKED":
        return "bg-blue-600";
      case "AVAILABLE":
        return "bg-green-500";
      case "CANCELED":
        return "bg-gray-400 text-gray-800 line-through";
      default:
        return "bg-gray-300";
    }
  }

  // ✅ PASSO 2: Crea una variabile derivata per pre-calcolare i dati
	const processedSlots = $derived(
		slots.map((slot) => {
			// Converte i Timestamp di Firestore in oggetti Date una sola volta
            // NOTA: Firebase passa oggetti Timestamp, non stringhe ISO.
			const startTimeDate = new Date(slot.startTime);
			const endTimeDate = new Date(slot.endTime);

			// Calcola tutti i valori necessari qui, una sola volta per slot
			const startMinutes = startTimeDate.getUTCHours() * 60 + startTimeDate.getUTCMinutes();
			const endMinutes = endTimeDate.getUTCHours() * 60 + endTimeDate.getUTCMinutes();
			const durationMinutes = endMinutes - startMinutes;
			const calendarStartMinutes = calendarStartHour * 60;
			
			const calculatedTop = ((startMinutes - calendarStartMinutes) / 60) * hourHeightRem;
			const calculatedHeight = (durationMinutes / 60) * hourHeightRem;
			const eventHeight = Math.max(calculatedHeight, minEventHeightRem);
			const isShortEvent = durationMinutes <= shortEventThresholdMinutes;

			return {
				...slot, // Mantiene i dati originali dello slot (id, status, ecc.)
				// Aggiunge i dati pre-calcolati
				formattedStartTime: formatTime(startTimeDate.toISOString()),
				formattedEndTime: formatTime(endTimeDate.toISOString()),
				calculatedTop,
				eventHeight,
				isShortEvent
			};
		})
	);

  // --- LOGICA DI SCROLL ---
  let scrollContainer: HTMLElement;

  onMount(() => {
    if (scrollContainer) {
      // All'avvio, non scrolliamo, partiamo dall'inizio (le 8:00)
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
    }
  });

  // Array per generare la griglia oraria da 8 a 19
  const hoursInView = Array.from(
    { length: calendarEndHour - calendarStartHour + 1 },
    (_, i) => i + calendarStartHour
  );

  const timeSlots: any[] = [];
  for (let h = calendarStartHour; h <= calendarEndHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      // Aggiungiamo lo slot solo se non supera l'ora di fine (es. 19:00)
      if (h < calendarEndHour || m === 0) {
        timeSlots.push({ hour: h, minute: m });
      }
    }
  }
</script>

<div class="max-w-2xl mx-auto bg-white p-4 rounded-lg shadow font-sans">
  <div
    class="relative overflow-y-auto border border-gray-200 rounded-lg"
    style:height="80vh"
    bind:this={scrollContainer}
  >
    <div
      class="relative mt-2"
      style:height="{hoursInView.length * hourHeightRem}rem"
    >
      <div class="ml-18 absolute inset-0">
        {#each timeSlots as slot}
          {@const totalMinutes =
            slot.hour * 60 + slot.minute - calendarStartHour * 60}
          {@const topPosition = (totalMinutes / 60) * hourHeightRem}

          {#if slot.minute === 0}
            <div
              class="absolute w-12 text-right text-sm text-secondary-500 pr-2 -translate-y-1/2"
              style:top="{topPosition}rem"
              style:left="-4rem"
            >
              {slot.hour.toString().padStart(2, "0")}:00
            </div>
          {/if}

          <div
            class="absolute border-t"
            class:border-primary-600={slot.minute === 0}
            class:border-primary-200={slot.minute !== 0}
            style:top="{topPosition}rem"
            style:left="0"
            style:right="0"
          ></div>
        {/each}
      </div>

      <div class="absolute top-0 left-12 right-0 h-full">
        {#each processedSlots as slot (slot.id)}
          {@const startMinutes = dateToMinutes(slot.startTime)}
          {@const endMinutes = dateToMinutes(slot.endTime)}
          {@const calendarStartMinutes = calendarStartHour * 60}

          {@const calculatedTop =
            ((startMinutes - calendarStartMinutes) / 60) * hourHeightRem}
          {@const durationMinutes = endMinutes - startMinutes}
          {@const calculatedHeight = (durationMinutes / 60) * hourHeightRem}

          {@const eventHeight = Math.max(calculatedHeight, minEventHeightRem)}
          {@const isShortEvent = durationMinutes <= shortEventThresholdMinutes}

          <div
            class="absolute w-full pr-4 py-0.5"
            style:top="{calculatedTop}rem"
            style:height="{eventHeight}rem"
          >
            <div
              class="{getStatusColor(
                slot.status
              )} text-white rounded-lg h-full flex flex-col justify-center shadow-md
                                {isShortEvent ? 'p-1 md:p-2' : 'p-3'}
                                {isShortEvent
                ? 'text-xs md:text-sm'
                : 'text-sm md:text-base'}"
            >
              <p
                class="{isShortEvent
                  ? 'font-normal'
                  : 'font-bold'} leading-tight"
              >
                {slot.status === "BOOKED" ? slot.speakerName : slot.status}
              </p>
              <p
                class="{isShortEvent
                  ? 'text-xs opacity-80'
                  : 'text-sm opacity-90'} leading-tight"
              >
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
