/**
 * Getting a Google access token in the browser with Google Identity Services (GIS).
 *
 * The token model needs no redirect and no server: Google's script opens its own consent popup
 * and hands back a short-lived token, which the caller keeps in memory only. Two browser rules
 * shape the API: the popup must be opened from a tap, so `requestGoogleToken` has to run
 * synchronously inside the click handler (hence `loadGoogleIdentity` is called ahead of time),
 * and the script is a third-party load, so it is fetched only once a student has a reason to
 * sign in — never at app start.
 *
 * Android's WebView and the desktop shell can't host this popup (Google blocks sign-in in an
 * embedded WebView), so `googleSignInAvailable` is false there and the file route stays.
 */
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

type TokenResponse = { access_token?: string; error?: string };

type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };

type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => TokenClient;
    };
  };
};

/** Google's script puts its API on `window.google`; typed here instead of widening `Window`. */
export const googleIdentity = (): GoogleIdentity | undefined =>
  (window as unknown as { google?: GoogleIdentity }).google;

/** The student closed the popup or declined: a decision, not a failure. */
export class GoogleSignInCancelled extends Error {
  override name = "GoogleSignInCancelled";
}

let loading: Promise<GoogleIdentity> | null = null;

/** Adds Google's script once; resolves with its API. Safe to call repeatedly. */
export const loadGoogleIdentity = (): Promise<GoogleIdentity> => {
  const ready = googleIdentity();
  if (ready !== undefined) return Promise.resolve(ready);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const loaded = googleIdentity();
      if (loaded === undefined) reject(new Error("Google sign-in did not load"));
      else resolve(loaded);
    };
    script.onerror = () => {
      loading = null; // offline now doesn't mean offline for good
      reject(new Error("Google sign-in could not be loaded"));
    };
    document.head.append(script);
  });
  return loading;
};

/**
 * Asks for a token with the script already loaded. Must be called from a click handler with no
 * `await` before it, or the browser blocks the popup.
 */
export const requestGoogleToken = (clientId: string, scope: string): Promise<string> => {
  const identity = googleIdentity();
  if (identity === undefined) return Promise.reject(new Error("Google sign-in is not loaded yet"));
  return new Promise<string>((resolve, reject) => {
    const client = identity.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.access_token !== undefined) resolve(response.access_token);
        else if (response.error === "access_denied") reject(new GoogleSignInCancelled());
        else reject(new Error(response.error ?? "Google sign-in failed"));
      },
      error_callback: (error) => {
        if (error.type === "popup_closed") reject(new GoogleSignInCancelled());
        else reject(new Error(error.type ?? "Google sign-in failed"));
      },
    });
    client.requestAccessToken();
  });
};
