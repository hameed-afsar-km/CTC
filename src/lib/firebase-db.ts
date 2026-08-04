import { getDb } from "./firebase-admin";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  "technocrats-165f7";

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
  try {
    const db = getDb();
    if (db) {
      const snapshot = await db.collection(collectionName).get();
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => d.data());
      }
    }
  } catch (err) {
    console.warn(
      `Firebase Admin fetch failed for collection '${collectionName}'. Falling back to Firestore REST API:`,
      err instanceof Error ? err.message : err
    );
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`;
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
  try {
    const db = getDb();
    if (db) {
      await db.collection(collectionName).doc(docId).set(data, { merge: true });
      return;
    }
  } catch (err) {
    console.warn(
      `Firebase Admin save failed for '${collectionName}/${docId}'. Falling back to REST API:`,
      err instanceof Error ? err.message : err
    );
  }

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

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore REST save failed (${res.status}): ${errText}`);
  }
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
  token?: string | null
): Promise<boolean> {
  try {
    const db = getDb();
    if (db) {
      await db.collection(collectionName).doc(docId).delete();
      return true;
    }
  } catch (err) {
    console.warn(
      `Firebase Admin delete failed for '${collectionName}/${docId}'. Falling back to REST API:`,
      err instanceof Error ? err.message : err
    );
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url, { method: "DELETE", headers });
  return res.ok;
}
