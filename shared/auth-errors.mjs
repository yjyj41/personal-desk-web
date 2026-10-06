export function authErrorMessage(error, hostname=globalThis.location?.hostname||''){
 switch(error?.code){
  case 'auth/unauthorized-domain':return ['localhost','127.0.0.1','[::1]'].includes(hostname)
   ? 'Google sign-in is not enabled for this local address. Open http://localhost:4173 and try again.'
   : `Google sign-in is not enabled for ${hostname||'this website'} yet. This website needs to be added to the app’s Firebase authorized domains. Your records have not changed.`;
  case 'auth/popup-blocked':return 'The sign-in window was blocked. Allow pop-ups for this site, then try again.';
  case 'auth/popup-closed-by-user':case 'auth/cancelled-popup-request':return 'Sign-in was cancelled. Your records have not changed.';
  case 'auth/network-request-failed':return 'Google sign-in could not connect. Check your connection and try again.';
  default:return 'Could not sign in. Please try again. If this continues, check your Google sign-in settings.';
 }
}
