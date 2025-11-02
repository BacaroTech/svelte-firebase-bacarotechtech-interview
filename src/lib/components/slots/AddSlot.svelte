<script lang="ts">
  let name = $state("free");
  let startTime = $state("");
  let endTime = $state("");
  let loading = $state(false);
  let error = $state("");
  let success = $state("");

  async function addSlot() {
    loading = true;
    error = "";
    success = "";

    if (!name || !startTime) {
      error = "Devi inserire sia il nome che l'orario.";
      loading = false;
      return;
    }

    if (startTime && !endTime) {
      endTime = new Date(
        new Date(startTime).getTime() + 15 * 60 * 1000
      ).toTimeString();
    }

    try {
      const response = await fetch("/api/slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, startTime, endTime }),
      });

      const result = await response.json();

      if (response.ok) {
        success = result.message;
        name = "";
        endTime = "";
        startTime = "";
        // await fetchSlots();
      } else {
        error = result.error;
      }
    } catch (e: any) {
      error = "Errore di rete: " + e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="container">
  <h1 class="text-2xl font-bold text-center mb-6">Aggiungi un Nuovo Slot</h1>

  <form onsubmit={addSlot}>
    <div class="form-group">
      <label for="name">Nome</label>
      <input
        type="text"
        id="name"
        placeholder="E.g. free"
        bind:value={name}
        required
      />
    </div>

    <div class="form-group">
      <label for="time">Orario</label>
      <input
        type="time"
        id="startTime"
        placeholder="E.g. 9:45"
        bind:value={startTime}
        required
      />
      <input
        type="time"
        id="endTime"
        placeholder="E.g. 10:00"
        bind:value={endTime}
      />
      <p>
        start time: {startTime}
      </p>
      <p>
        end time: {endTime}
      </p>
    </div>

    <button type="submit" disabled={loading}>
      {#if loading}
        Aggiunta...
      {:else}
        Aggiungi Slot
      {/if}
    </button>
  </form>

  {#if success}
    <div class="feedback success">{success}</div>
  {/if}

  {#if error}
    <div class="feedback error">{error}</div>
  {/if}

  <hr class="my-8 border-t border-gray-300" />
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
  input {
    width: 100%;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 16px;
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
