import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAdminDb } from "./firebase-admin";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "technocrats-165f7",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getDbInstance() {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
  } catch (err) {
    console.warn("Firestore initialization warning:", err);
    return null;
  }
}

interface FirestoreRestValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  mapValue?: { fields: Record<string, FirestoreRestValue> };
  arrayValue?: { values: FirestoreRestValue[] };
  timestampValue?: string;
  nullValue?: null;
}

interface FirestoreRestDoc {
  name: string;
  fields?: Record<string, FirestoreRestValue>;
  createTime?: string;
  updateTime?: string;
}

function parseRestValue(val: FirestoreRestValue): unknown {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.mapValue) {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseRestValue(v);
    }
    return res;
  }
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map(parseRestValue);
  }
  return null;
}

function parseRestDocument(doc: FirestoreRestDoc): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (doc.fields) {
    for (const [key, val] of Object.entries(doc.fields)) {
      data[key] = parseRestValue(val);
    }
  }
  if (!data.id) {
    const parts = doc.name.split("/");
    data.id = parts[parts.length - 1];
  }
  return data;
}

function encodeRestValue(val: unknown): FirestoreRestValue {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (val === null || val === undefined) return { nullValue: null };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeRestValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, FirestoreRestValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = encodeRestValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function fetchCollectionDocs(
  collectionName: string
): Promise<Record<string, unknown>[]> {
  // 1. Try Firebase Admin SDK (Server-side)
  if (typeof window === "undefined") {
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const snap = await adminDb.collection(collectionName).get();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
      }
    } catch (err) {
      console.warn(`Admin Firestore fetch warning for '${collectionName}':`, err);
    }
  }

  // 2. Try Firebase Client Web SDK
  try {
    const db = getDbInstance();
    if (db) {
      const snap = await getDocs(collection(db, collectionName));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    }
  } catch (err) {
    console.warn(`Firestore Web SDK fetch warning for '${collectionName}':`, err);
  }

  // 3. Fallback to direct Firestore REST API
  try {
    const PROJECT_ID = firebaseConfig.projectId;
    const API_KEY = firebaseConfig.apiKey || "";
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300${
      API_KEY ? `&key=${API_KEY}` : ""
    }`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map((doc: FirestoreRestDoc) => parseRestDocument(doc));
  } catch (err) {
    console.error(`Firestore REST fallback error for '${collectionName}':`, err);
    return [];
  }
}

export async function saveDocument(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  token?: string | null
): Promise<void> {
  // 1. Try Firebase Admin SDK (Server-side)
  if (typeof window === "undefined") {
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await adminDb.collection(collectionName).doc(docId).set(data, { merge: true });
        return;
      }
    } catch (err) {
      console.warn(`Admin Firestore save warning for '${collectionName}/${docId}':`, err);
    }
  }

  // 2. Try Firebase Client Web SDK
  try {
    const db = getDbInstance();
    if (db) {
      await setDoc(doc(db, collectionName, docId), data, { merge: true });
      return;
    }
  } catch (err) {
    console.warn(`Firestore Web SDK save warning for '${collectionName}/${docId}':`, err);
  }

  // 3. REST API Fallback
  const PROJECT_ID = firebaseConfig.projectId;
  const API_KEY = firebaseConfig.apiKey || "";
  const keyParam = API_KEY ? `?key=${API_KEY}` : "";

  const fields: Record<string, FirestoreRestValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = encodeRestValue(v);
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${docId}${keyParam}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore save failed (${res.status}): ${errText}`);
  }
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
  token?: string | null
): Promise<boolean> {
  // 1. Try Firebase Admin SDK (Server-side)
  if (typeof window === "undefined") {
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await adminDb.collection(collectionName).doc(docId).delete();
        return true;
      }
    } catch (err) {
      console.warn(`Admin Firestore delete warning for '${collectionName}/${docId}':`, err);
    }
  }

  // 2. Try Firebase Client Web SDK
  try {
    const db = getDbInstance();
    if (db) {
      await deleteDoc(doc(db, collectionName, docId));
      return true;
    }
  } catch (err) {
    console.warn(`Firestore Web SDK delete warning for '${collectionName}/${docId}':`, err);
  }

  // 3. REST API Fallback
  const PROJECT_ID = firebaseConfig.projectId;
  const API_KEY = firebaseConfig.apiKey || "";
  const keyParam = API_KEY ? `?key=${API_KEY}` : "";

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${docId}${keyParam}`;
  const res = await fetch(url, { method: "DELETE", headers });
  return res.ok;
}

