<script lang="ts">
  import { onMount } from "svelte";
  import { authClient, googleProvider } from "$lib/firebase/firebase.client";

  import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    type UserCredential,
  } from "firebase/auth";

  import { goto } from "$app/navigation";
  import { userState } from "$lib/store/userstore.svelte";
  
  let email = $state("");
  let password = $state("");
  let message = $state("");
  let error: string | null = $state(null);
  let loading = $state(false);

  async function handleSuccessfulAuth() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      
      const idToken = await currentUser.getIdToken(true);
      const email = currentUser.email;
      
      const fcmToken = localStorage.getItem('fcm_token');
      
      const response = await fetch("/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, email, fcmToken  }),
      });
      
      userState.loggedin = true;
      
      if (response.status >= 300 && response.status <= 308) {        
        const locationHeader = response.headers.get("Location");

        if (locationHeader) {
          await goto(locationHeader);
          
          return;
        }
      }
      if (!response.ok) {
        message = "User no Syncronized";
      } else {
        message = "user ok";
        window.location.href = '/app';
      }      
    }
  }

  async function exchangeTokenForCookie(userCredential: UserCredential) {
    const user = userCredential.user;
    const idToken = await user.getIdToken(true);

    
    const response = await fetch("/api/session", {
      method: "POST",
      body: JSON.stringify({ idToken }),
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      message = "User Sessions success";
    } else {
      const result = await response.json();
      error = result.message || "Errore nella creazione della sessione server.";
    }
  }
  async function handleEmailPasswordLogin() {
    loading = true;
    error = null;
    try {
      const userCredential = await signInWithEmailAndPassword(
        authClient,
        email,
        password
      );

      await exchangeTokenForCookie(userCredential);
      
      await handleSuccessfulAuth();

    } catch (e) {
      console.error("Login Email/Password fallito:", e);
      error = "Credenziali non valide o errore di rete.";
    } finally {
      loading = false;
    }
  }

  async function handleGoogleLogin() {
    loading = true;
    error = null;
    try {
      const userCredential = await signInWithPopup(authClient, googleProvider);

      await exchangeTokenForCookie(userCredential);

      await handleSuccessfulAuth();

    } catch (e) {
      console.error("Login Google fallito:", e);
      error = "Login annullato o errore del provider Google.";
    } finally {
      loading = false;
    }

  }
  function login() {
    handleEmailPasswordLogin().then()
    .catch((e)=> {console.error("erro loginr", e)});
  }

  function googleLogin(): any {
    handleGoogleLogin().then()
    .catch((e)=> {console.error("error googleLogin", e)});
  }

</script>


<div class="flex min-h-full">
  <div
    class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
  >
    <div class="mx-auto w-full max-w-sm lg:w-96">
      <div class="mt-10">
        <div>
          <form class="space-y-6">
            <div>
              <label
                for="email"
                class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100"
                >Email address</label
              >
              <div class="mt-2">
                <input
                  id="email"
                  type="email"
                  name="email"
                  bind:value={email}
                  required
                  autocomplete="email"
                  class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-primary-500"
                />
              </div>
            </div>

            <div>
              <label
                for="password"
                class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100"
                >Password</label
              >
              <div class="mt-2">
                <input
                  id="password"
                  type="password"
                  name="password"
                  bind:value={password}
                  required
                  autocomplete="current-password"
                  class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-primary-500"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                onclick={() => login()}
                class="flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:bg-primary-500 dark:shadow-none dark:hover:bg-primary-400 dark:focus-visible:outline-primary-500"
                >Sign in</button
              >
            </div>
          </form>
        </div>

        <div class="mt-10">
          <div class="relative">
            <div aria-hidden="true" class="absolute inset-0 flex items-center">
              <div
                class="w-full border-t border-gray-200 dark:border-gray-700"
              ></div>
            </div>
            <div class="relative flex justify-center text-sm/6 font-medium">
              <span
                class="bg-white px-6 text-gray-900 dark:bg-gray-900 dark:text-gray-300"
                >Or continue with</span
              >
            </div>
          </div>

          <div class="mt-6 grid grid-cols-2 gap-4">
            <button
              onclick={() => googleLogin()}
              class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:inset-ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5">
                <path
                  d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                  fill="#34A853"
                />
              </svg>
              <span class="text-sm/6 font-semibold">Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="relative hidden w-0 flex-1 lg:block">
    <img
      src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
      alt=""
      class="absolute inset-0 size-full object-cover"
    />
  </div>
</div>
