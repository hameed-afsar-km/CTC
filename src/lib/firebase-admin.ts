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
  const value = unwrap(process.env.FIREBASE_PRIVATE_KEY);
  if (!value) return undefined;
  return value.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  const projectId = unwrap(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = unwrap(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = getPrivateKey();
  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && "FIREBASE_PROJECT_ID",
      !clientEmail && "FIREBASE_CLIENT_EMAIL",
      !privateKey && "FIREBASE_PRIVATE_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Missing Firebase Admin credentials (${missing}). Add them to your Vercel environment variables.`
    );
  }
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

let cachedDb: Firestore | undefined;

export function getDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getFirebaseAdminApp());
  }
  return cachedDb;
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getFirebaseAdminApp());
}

export function getStorageBucket(): string {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (fromEnv) return fromEnv;
  return `${process.env.FIREBASE_PROJECT_ID || "ctc"}.appspot.com`;
}
