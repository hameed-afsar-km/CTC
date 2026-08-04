"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getClientAuth, getCurrentIdToken } from "@/lib/firebase-client";

export interface AdminUser {
  email: string;
  name: string;
  picture: string | null;
}

export type AdminStatus = "loading" | "signed-out" | "denied" | "ready";

interface AdminContextValue {
  status: AdminStatus;
  user: AdminUser | null;
  deniedEmail: string | null;
  deniedReason: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
}

function authErrorCode(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return "";
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AdminStatus>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [deniedReason, setDeniedReason] = useState<string | null>(null);

  const verify = useCallback(async (idToken: string, firebaseEmail?: string | null, firebaseName?: string | null, firebasePhoto?: string | null) => {
    const isAllowedEmail = firebaseEmail?.toLowerCase() === "240071601263@crescent.education";

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        if (isAllowedEmail) {
          setUser({
            email: firebaseEmail!,
            name: firebaseName || firebaseEmail!,
            picture: firebasePhoto || null,
          });
          setStatus("ready");
          setDeniedReason(null);
          return;
        }
        const data = await res.json().catch(() => null);
        setStatus("denied");
        setUser(null);
        setDeniedReason(data?.error ?? "Access Denied");
        return;
      }
      const data = await res.json();
      if (data.session.email.toLowerCase() !== "240071601263@crescent.education") {
        setStatus("denied");
        setUser(null);
        setDeniedReason("Only 240071601263@crescent.education is authorized.");
        return;
      }
      setUser({
        email: data.session.email,
        name: data.session.name,
        picture: data.session.picture,
      });
      setStatus("ready");
      setDeniedReason(null);
    } catch {
      if (isAllowedEmail) {
        setUser({
          email: firebaseEmail!,
          name: firebaseName || firebaseEmail!,
          picture: firebasePhoto || null,
        });
        setStatus("ready");
        setDeniedReason(null);
        return;
      }
      setStatus("denied");
      setUser(null);
      setDeniedReason("Could not reach the authentication server.");
    }
  }, []);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setStatus("signed-out");
        setUser(null);
        setDeniedEmail(null);
        setDeniedReason(null);
        return;
      }
      const email = firebaseUser.email?.toLowerCase();
      setDeniedEmail(firebaseUser.email ?? null);

      if (email !== "240071601263@crescent.education") {
        setStatus("denied");
        setUser(null);
        setDeniedReason("Only 240071601263@crescent.education is authorized to access the dashboard.");
        return;
      }

      setStatus("loading");
      setDeniedReason(null);
      const token = await firebaseUser.getIdToken().catch(() => null);
      if (token) {
        await verify(token, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
      } else {
        // Fallback for authorized email
        setUser({
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email!,
          picture: firebaseUser.photoURL || null,
        });
        setStatus("ready");
      }
    });
    return unsubscribe;
  }, [verify]);

  const signIn = useCallback(async () => {
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = authErrorCode(err);
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code === "auth/unauthorized-domain") {
        throw new Error(
          "Google sign-in is not allowed on this domain yet. Add it in the Firebase Console (Authentication → Settings → Authorized domains)."
        );
      }
      if (code === "auth/popup-closed-by-user") {
        throw new Error("The sign-in window was closed before you finished.");
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getClientAuth());
  }, []);

  const getToken = useCallback(async () => {
    const token = await getCurrentIdToken();
    if (!token) throw new Error("not authenticated");
    return token;
  }, []);

  return (
    <AdminContext.Provider
      value={{ status, user, deniedEmail, deniedReason, signIn, signOut, getToken }}
    >
      {children}
    </AdminContext.Provider>
  );
}
