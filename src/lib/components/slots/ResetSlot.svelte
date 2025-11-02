<script lang="ts">
  let resetLoading = $state(false);
  let resetError = $state("");
  let resetSuccess = $state("");

async function initSpeaker () {
    try {
        const response = await fetch("/api/speaker", {
        method: "POST",
      });
         const result = await response.json();
    } catch (error) {
      console.error("error", error)
    }
}

  async function asyncReset() {
    try {
      resetLoading = true;
      const response = await fetch("/api/slots", {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        const responseInitialize = await fetch("/api/slots/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (responseInitialize.ok) {
          resetSuccess = "Slot inizializzati correttamente";
        }
      } else {
        resetError = result.error;
      }
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        resetError = "Errore: il JSON inserito non è valido.";
      } else {
        resetError = "Errore di rete: " + e.message;
      }
    } finally {
      resetLoading = false;
    }
  }
</script>

<div class="container">
  <button
    class="rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    onclick={asyncReset}
  >
    Reset Configurazioni
    {#if resetLoading}
      reset in corso...
    {/if}
  </button>

  {#if resetSuccess}
    <div class="feedback success">{resetSuccess}</div>
  {/if}
  {#if resetError}
    <div class="feedback error">{resetError}</div>
  {/if}

  <button
    class="rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    onclick={initSpeaker}
  >
    initSpeaker
    
  </button>
</div>

<style>
  .container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    background-color: #f9fafb;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
