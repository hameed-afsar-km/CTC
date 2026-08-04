"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
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
        setDeniedEmail(null);
        return;
      }
      setStatus("loading");
      setDeniedEmail(firebaseUser.email ?? null);
      const token = await firebaseUser.getIdToken().catch(() => null);
      if (token) await verify(token);
      else {
        setStatus("denied");
        setUser(null);
      }
    });
    return unsubscribe;
  }, [verify]);

  const signIn = useCallback(async () => {
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
    <AdminContext.Provider value={{ status, user, deniedEmail, signIn, signOut, getToken }}>
      {children}
    </AdminContext.Provider>
  );
}
