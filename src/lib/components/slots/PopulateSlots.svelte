<script lang="ts">
  import { fakeSlotFree } from "$lib/config/mock/fake-slot";

  let slotsJson = $state(JSON.stringify(fakeSlotFree));
  let populateLoading = $state(false);
  let populateError = $state("");
  let populateSuccess = $state("");

  async function populateSlots() {
    populateLoading = true;
    populateError = "";
    populateSuccess = "";

    try {
      const parsedJson = JSON.parse(slotsJson);

      const response = await fetch("/api/slots/populate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedJson),
      });

      const result = await response.json();

      if (response.ok) {
        populateSuccess = result.message;
        slotsJson = "";
        // fetchSlots();
      } else {
        populateError = result.error;
      }
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        populateError = "Errore: il JSON inserito non è valido.";
      } else {
        populateError = "Errore di rete: " + e.message;
      }
    } finally {
      populateLoading = false;
    }
  }

</script>

<div class="container">
  
  <section>
    <h2 class="text-xl font-bold mb-4">Popola slot in blocco</h2>
    <p class="text-gray-600 mb-4">
      Incolla qui il JSON degli slot che vuoi aggiungere.
    </p>
    <form onsubmit={populateSlots}>
      <div class="form-group">
        <label for="slots-json">JSON degli Slot</label>
        <textarea id="slots-json" class="w-full h-90" bind:value={slotsJson}></textarea>
      </div>
      <button type="submit" disabled={populateLoading}>
        {#if populateLoading}
          Popolando...
        {:else}
          Popola Slot
        {/if}
      </button>
    </form>

    {#if populateSuccess}
      <div class="feedback success">{populateSuccess}</div>
    {/if}
    {#if populateError}
      <div class="feedback error">{populateError}</div>
    {/if}
  </section>
</div>

<style>
  /* Stili CSS identici a prima */
  .container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    background-color: #f9fafb;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .form-group {
    margin-bottom: 20px;
  }
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #374151;
  }

  button {
    width: 100%;
    padding: 12px;
    background-color: #4f46e5;
    color: white;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  button:hover:not(:disabled) {
    background-color: #4338ca;
  }
  button:disabled {
    background-color: #a5b4fc;
    cursor: not-allowed;
  }
  .feedback {
    margin-top: 20px;
    padding: 12px;
    border-radius: 4px;
    text-align: center;
    font-weight: 500;
  }
  .success {
    background-color: #d1fae5;
    color: #065f46;
  }
  .error {
    background-color: #fee2e2;
    color: #991b1b;
  }
</style>
