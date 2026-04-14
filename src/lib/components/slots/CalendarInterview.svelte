<script lang="ts">
  import type { InterviewSlot } from "$lib/type/slots";
  import { onMount } from "svelte";
  import { collection, onSnapshot, query } from "firebase/firestore";
  import { dbClient } from "$lib/firebase/firebase.client";
  import CalendarSlot from "./CalendarSlot.svelte";

  let slots = $state([] as InterviewSlot[]);
  let slotsLoading = $state(true);
  let slotsError = $state("");

  onMount(() => {
    if (!dbClient) return;
    slotsLoading = true;

    const unsubscribe = onSnapshot(
      query(collection(dbClient, "slots")),
      (snapshot) => {
        let _slots: InterviewSlot[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const startDate = data.startTime?.toDate?.() ?? new Date(data.startTime);
            const endDate = data.endTime?.toDate?.() ?? new Date(data.endTime);
            return {
              ...data,
              docId: doc.id,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              startTimeString: startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
              endTimeString: endDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
            } as InterviewSlot;
          })
          .filter((slot) => isValid(slot.startTime) && isValid(slot.endTime))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        slots = _slots;
        slotsLoading = false;
      },
      (error) => {
        console.error("[onSnapshot] slots error:", error);
        slotsError = "Errore nel caricamento degli slot.";
        slotsLoading = false;
      }
    );

    return unsubscribe;
  });

  function isValid(startTime: string | null | undefined) {
    if (!startTime) {
      return false;
    }
    if (startTime === "Invalid Date") return false;
    return true; //isTimeWithinRange(startTime, `08:00`, '19:00');
  }

  /**
   * Controlla se un dato momento rientra in un intervallo di tempo specifico (inclusivo).
   * È robusta e gestisce correttamente date non valide o nulle.
   *
   * @param timeToCheck - Il momento da verificare (stringa ISO o oggetto Date).
   * @param eventStartTime - L'inizio dell'intervallo (stringa ISO o oggetto Date).
   * @param eventEndTime - La fine dell'intervallo (stringa ISO o oggetto Date).
   * @returns {boolean} - Ritorna `true` se il momento è nell'intervallo, altrimenti `false`.
   */
  function isTimeWithinRange(
    timeToCheck: string | Date | null | undefined,
    eventStartTime: string | Date | null | undefined,
    eventEndTime: string | Date | null | undefined
  ): boolean {
    // 1. Controllo preliminare per valori nulli o non definiti
    if (!timeToCheck || !eventStartTime || !eventEndTime) {
      console.error("Errore: una o più date non sono state fornite.");
      return false;
    }

    // 2. Conversione sicura in oggetti Date
    const checkDate = new Date(timeToCheck);
    const startDate = new Date(eventStartTime);
    const endDate = new Date(eventEndTime);

    // 3. Validazione robusta delle date
    // isNaN(date.getTime()) è il modo corretto per verificare se una data è valida
    if (
      isNaN(checkDate.getTime()) ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      console.error(
        "Errore: una o più stringhe non sono state convertite in date valide."
      );
      return false;
    }

    // 4. Logica di confronto
    // Confronta i timestamp numerici per la massima precisione
    const checkTimestamp = checkDate.getTime();
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    return checkTimestamp >= startTimestamp && checkTimestamp <= endTimestamp;
  }
</script>

<div class="w-full">
  <CalendarSlot {slots} />
</div>
