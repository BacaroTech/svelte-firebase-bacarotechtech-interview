<script lang="ts">
  import { onMount } from "svelte";
  import { messaging } from "$lib/firebase/firebase.client"; // Usiamo l'alias $lib

  import { getToken, onMessage } from "firebase/messaging";
  import { env } from "$env/dynamic/public";
  import { tooltip } from "../tools/tootlip";

  let notificationPermission: NotificationPermission = $state("default");
  let fcmToken = $state("");
  let error: string | HTMLElement = $state("");

  async function requestPermissionAndGetToken() {
    if (!messaging) {
      return;
    }
    try {
      // Richiesta del permesso
      const permission = await Notification.requestPermission();
      notificationPermission = permission;

      if (permission === "granted") {
        const currentToken = await getToken(messaging, {
          vapidKey: env.PUBLIC_CLOUD_MESSAGING_KEY,
        });

        if (currentToken) {
          fcmToken = currentToken;

          localStorage.setItem("fcm_token", currentToken);

          await saveTokenToServer(currentToken);
        } else {
          console.warn(
            "Nessun token di registrazione disponibile. Richiedi il permesso per generarne uno."
          );
          error =
            "Impossibile ottenere il token. Assicurati di essere su HTTPS.";
        }
      } else {
        console.warn("Permesso per le notifiche negato.");
        error =
          "Hai bloccato le notifiche. Per abilitarle, modifica le impostazioni del tuo browser.";
      }
    } catch (err) {
      console.error(
        "Errore durante la richiesta del permesso o l'ottenimento del token:",
        err
      );
      error = "Si è verificato un errore.";
    }
  }

  async function saveTokenToServer(token: string) {
    try {
      const response = await fetch("/api/save-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("La richiesta al server è fallita");
      }

      console.log("Token salvato correttamente sul server.");
    } catch (err) {
      console.error("Errore durante il salvataggio del token sul server:", err);
      // Non mostrare questo errore all'utente, il token è comunque valido sul client
    }
  }
  const bellIconPath =
    "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0";
</script>

<div class="flex items-center space-x-2">
  {#if notificationPermission === "default"}
    <button
      type="button"
      class="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      title="Abilita Notifiche"
      onclick={requestPermissionAndGetToken}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d={bellIconPath} />
      </svg>
    </button>
  {:else if notificationPermission === "granted"}
    <div class="p-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6 text-green-500"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d={bellIconPath} />
      </svg>
    </div>
  {:else}
    <div class="p-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6 text-red-500"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d={bellIconPath} />
      </svg>
    </div>
  {/if}
</div>

<style>
  :global(.animated) {
    transition: all 0.2s ease-in-out;
  }

  :global(.min-w-56) {
    min-width: 14rem;
  }

  :global(.max-h-16) {
    max-height: 4rem;
  }

  :global(.scale-null) {
    transform: scale(0);
  }

  :global(.scale-full) {
    transform: scale(1);
  }

  :global(.top-full) {
    top: 100%;
  }
</style>
