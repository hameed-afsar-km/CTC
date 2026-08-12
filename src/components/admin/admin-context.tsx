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
import type { AdminRole, ScopePermissions } from "@/lib/roles";

export interface AdminUser {
  email: string;
  name: string;
  picture: string | null;
  role: AdminRole;
  permissions: ScopePermissions;
}

export type AdminStatus = "loading" | "signed-out" | "denied" | "ready";

interface AdminContextValue {
  status: AdminStatus;
  user: AdminUser | null;
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

  const verify = useCallback(async (idToken: string) => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        setStatus("denied");
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser({
        email: data.session.email,
        name: data.session.name,
        picture: data.session.picture,
        role: data.session.role ?? "admin",
        permissions: data.session.permissions ?? {},
      });
      setStatus("ready");
    } catch {
      setStatus("denied");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setStatus("signed-out");
        setUser(null);
        return;
      }
      setStatus("loading");
      setUser(null);
      const token = await firebaseUser.getIdToken().catch(() => null);
      if (token) {
        await verify(token);
      } else {
        setStatus("denied");
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
    <AdminContext.Provider value={{ status, user, signIn, signOut, getToken }}>
      {children}
    </AdminContext.Provider>
  );
}
