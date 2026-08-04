import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import type { Storage } from "firebase-admin/storage";

function getPrivateKey(): string | undefined {
  const value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) return undefined;
  return value.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)");
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
