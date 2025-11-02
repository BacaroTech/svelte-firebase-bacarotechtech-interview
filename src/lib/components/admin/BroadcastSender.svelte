<script lang="ts">
  let title = $state("");
  let message = $state("");
  let isLoading = $state(false);
  let feedback: { type: 'success' | 'error'; text: string } | null = $state(null);

  async function sendBroadcast() {
    if (!title.trim() || !message.trim()) {
      feedback = { type: 'error', text: 'Titolo e messaggio non possono essere vuoti.' };
      return;
    }

    isLoading = true;
    feedback = null;

    try {
      const response = await fetch('/api/send-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, message }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Errore del server');
      }

      feedback = { type: 'success', text: result.message };
      title = "";
      message = "";

    } catch (err: any) {
      feedback = { type: 'error', text: err.message || 'Si è verificato un errore imprevisto.' };
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="w-full broadcast-container">
  <h3>Invia Notifica a Tutti gli Utenti</h3>
  
  <div class="form-group">
    <label for="title">Titolo della notifica</label>
    <input 
      id="title" 
      type="text" 
      bind:value={title} 
      placeholder="Es: Annuncio importante" 
      disabled={isLoading} 
    />
  </div>

  <div class="form-group">
    <label for="message">Messaggio della notifica</label>
    <textarea 
      id="message" 
      bind:value={message} 
      rows="4" 
      placeholder="Scrivi qui il tuo messaggio..." 
      disabled={isLoading}
    ></textarea>
  </div>
  
  <button onclick={sendBroadcast} disabled={isLoading}>
    {isLoading ? 'Invio in corso...' : 'Invia Notifica Broadcast'}
  </button>

  {#if feedback}
    <p class="feedback {feedback.type}">
      {feedback.text}
    </p>
  {/if}
</div>

<style>
  .broadcast-container {
    max-width: 500px;
    padding: 20px;
    border: 0px solid #ccc;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  label {
    font-weight: bold;
    font-size: 0.9em;
  }
  input, textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-sizing: border-box; /* Important for width */
  }
  button {
    padding: 10px 15px;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
  }
  button:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
  .feedback {
    margin-top: 10px;
    padding: 10px;
    border-radius: 4px;
  }
  .feedback.success {
    color: #155724;
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
  }
  .feedback.error {
    color: #721c24;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
  }
</style>