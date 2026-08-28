import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";

// Global suppression for Firebase Auth IndexedDB "Database is closing/hidden" race.
// The Firebase SDK's default indexedDBLocalPersistence closes its IndexedDB
// connection on `visibilitychange` / `pagehide` and throws if a token refresh
// or persistence write races with the tab being hidden. It is harmless but
// surfaced as an unhandled rejection in Next.js Turbopack dev overlay. We:
// (1) force Auth to use browserLocalPersistence (localStorage) instead of
//     IndexedDB so the race never happens, and (2) swallow any stray rejections.
let globalHandlerInstalled = false;
function installGlobalHandler() {
  if (globalHandlerInstalled || typeof window === "undefined") return;
  globalHandlerInstalled = true;
  const isHiddenDbError = (reason: unknown) => {
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : String(reason ?? "");
    return msg.includes("Database is closing") || msg.includes("Database is closing/hidden");
  };
  const isNetworkError = (reason: unknown) => {
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : String(reason ?? "");
    const code = (reason as { code?: string })?.code ?? "";
    return msg.includes("network-request-failed") || code.includes("network-request-failed");
  };
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    if (isHiddenDbError(event.reason)) {
      event.preventDefault();
      console.warn("[Firebase Auth] Suppressed IndexedDB hidden-state error (unhandledrejection)");
      return;
    }
    if (isNetworkError(event.reason)) {
      event.preventDefault();
      console.debug("[Firebase Auth] Suppressed network error (unhandledrejection)");
    }
  });
  window.addEventListener("error", (event: ErrorEvent) => {
    if (event.message && event.message.includes("Database is closing")) {
      event.preventDefault();
    }
  });
}
if (typeof window !== "undefined") installGlobalHandler();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getClientApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let cachedAuth: Auth | null = null;
let persistenceMigrated = false;

export function getClientAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getClientApp();
  installGlobalHandler();
  cachedAuth = getAuth(app);
  // Migrate from the default IndexedDB persistence (which throws
  // "Database is closing/hidden" on visibilitychange) to
  // browserLocalPersistence (localStorage). Do it once, fire-and-forget,
  // so we never hit the initializeAuth argument-validation path that was
  // causing auth/argument-error.
  if (typeof window !== "undefined" && !persistenceMigrated) {
    persistenceMigrated = true;
    import("firebase/auth")
      .then(({ setPersistence, browserLocalPersistence }) =>
        setPersistence(cachedAuth!, browserLocalPersistence).catch(() => {})
      )
      .catch(() => {});
  }
  return cachedAuth;
}

export async function getCurrentIdToken(): Promise<string | null> {
  try {
    const auth = getClientAuth();
    const user = auth.currentUser;
    if (!user) return null;
    // Prefer cached token first (no network) to avoid transient
    // auth/network-request-failed when offline or flaky.
    try {
      const cached = await user.getIdToken(false);
      if (cached) return cached;
    } catch {
      // fall through to force refresh
    }
    return await user.getIdToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    const code = (err as { code?: string })?.code ?? "";
    if (msg.includes("Database is closing") || msg.includes("hidden")) {
      console.warn("[Firebase Auth] getIdToken suppressed hidden-DB error, returning null for retry");
      return null;
    }
    if (
      msg.includes("network-request-failed") ||
      code.includes("network-request-failed") ||
      code.includes("auth/network")
    ) {
      // Transient offline — don't spam error overlay; caller will treat as
      // unauthenticated and can retry. Use debug so it doesn't appear as
      // [browser] error in Next.js dev logs.
      console.debug("[Firebase Auth] getIdToken network unavailable, returning null:", code || msg);
      return null;
    }
    console.warn("getCurrentIdToken error:", err);
    return null;
  }
}
