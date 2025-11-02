<script lang="ts">
  import { authClient } from "$lib/firebase/firebase.client"; // Il tuo file di init di Firebase
  import { signOut } from "firebase/auth";
  import { goto } from "$app/navigation"; // L'utility di SvelteKit per la navigazione

  let isLoading = $state(false);
  let error: string | null = $state(null);

  /**
   * Gestisce il processo di logout
   */
  async function handleLogout() {
    isLoading = true;
    error = null;

    try {
      await signOut(authClient);

      await goto("/");

    } catch (err) {
      console.error("Errore durante il logout:", err);
      error = "Impossibile effettuare il logout. Riprova.";
    } finally {
      isLoading = false;
    }
  }
</script>

<button onclick={handleLogout} disabled={isLoading}>
  {isLoading ? "Uscita in corso..." : "Logout"}
</button>

{#if error}
  <p style="color: red; font-size: 0.8em;">{error}</p>
{/if}

<style>
  button {
    cursor: pointer;
    padding: 8px 16px;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
    border-radius: 4px;
    font-weight: bold;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>