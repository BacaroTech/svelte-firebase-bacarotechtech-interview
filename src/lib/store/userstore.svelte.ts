import { browser } from '$app/environment';
import { authClient } from '$lib/firebase/firebase.client';
import type { UserState } from '$lib/type/slots';
import { onAuthStateChanged } from 'firebase/auth';

export const userState: UserState = $state({ loggedin: false });

if (browser) {
 onAuthStateChanged(authClient, (firebaseUser) => {
      console.log("User", firebaseUser);
      if (firebaseUser) userState.loggedin = true;
      else userState.loggedin = false;
    });
}