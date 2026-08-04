import { getDb } from "./firebase-admin";

export interface SiteUser {
  email: string;
  name: string;
  roles: string[];
  sources: string[];
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "users";

export async function getUsers(): Promise<SiteUser[]> {
  const db = getDb();
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION).orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as SiteUser);
}

export async function getUser(email: string): Promise<SiteUser | null> {
  const db = getDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTION).doc(email).get();
  return doc.exists ? (doc.data() as SiteUser) : null;
}

export async function upsertUser(input: {
  email: string;
  name: string;
  source: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const db = getDb();
  if (!db) return;
  const ref = db.collection(COLLECTION).doc(email);
  const existing = await ref.get();
  const now = new Date().toISOString();
  if (existing.exists) {
    const data = existing.data() as SiteUser;
    await ref.update({
      name: data.name || input.name,
      sources: Array.from(new Set([...(data.sources ?? []), input.source])),
      updatedAt: now,
    });
  } else {
    await ref.set({
      email,
      name: input.name,
      roles: [],
      sources: [input.source],
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function setUserRoles(email: string, roles: string[]): Promise<SiteUser | null> {
  const db = getDb();
  if (!db) return null;
  const ref = db.collection(COLLECTION).doc(email);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.update({ roles, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return updated.data() as SiteUser;
}

export async function createUser(input: {
  name: string;
  email: string;
  roles?: string[];
}): Promise<SiteUser> {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const user: SiteUser = {
    email,
    name: input.name.trim(),
    roles: input.roles ?? [],
    sources: [],
    createdAt: now,
    updatedAt: now,
  };
  const db = getDb();
  if (db) {
    await db.collection(COLLECTION).doc(email).set(user);
  }
  return user;
}
