import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import type { Storage } from "firebase-admin/storage";

function unwrap(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function getPrivateKey(): string | undefined {
  let value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") {
      value = parsed;
    }
  } catch {
    // Not valid JSON, which is fine
  }

  value = unwrap(value) || value;
  value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  return value;
}

export function getFirebaseAdminApp() {
  try {
    if (getApps().length > 0) {
      return getApp();
    }
    const projectId = unwrap(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = unwrap(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = getPrivateKey();
    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } catch (err) {
    console.warn("Firebase Admin initialization error:", err instanceof Error ? err.message : err);
    return null;
  }
}

let cachedDb: Firestore | undefined;

export function getDb(): Firestore | null {
  try {
    const app = getFirebaseAdminApp();
    if (!app) return null;
    if (!cachedDb) {
      cachedDb = getFirestore(app);
    }
    return cachedDb;
  } catch (err) {
    console.warn("getDb error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    const app = getFirebaseAdminApp();
    if (!app) return null;
    return getAuth(app);
  } catch {
    return null;
  }
}

export function getAdminStorage(): Storage | null {
  try {
    const app = getFirebaseAdminApp();
    if (!app) return null;
    return getStorage(app);
  } catch {
    return null;
  }
}

export function getStorageBucket(): string {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (fromEnv) return fromEnv;
  return `${process.env.FIREBASE_PROJECT_ID || "ctc"}.appspot.com`;
}
