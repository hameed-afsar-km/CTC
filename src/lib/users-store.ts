import { fetchCollectionDocs, saveDocument } from "./firebase-db";

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
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as SiteUser[];
  return items.sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime()
  );
}

export async function getUser(email: string): Promise<SiteUser | null> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function upsertUser(input: {
  email: string;
  name: string;
  source: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const existing = await getUser(email);
  const now = new Date().toISOString();
  if (existing) {
    await saveDocument(COLLECTION, email, {
      name: existing.name || input.name,
      sources: Array.from(new Set([...(existing.sources ?? []), input.source])),
      updatedAt: now,
    });
  } else {
    await saveDocument(COLLECTION, email, {
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
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(COLLECTION, cleanEmail, { roles, updatedAt: now });
  return { ...existing, roles, updatedAt: now };
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
  await saveDocument(COLLECTION, email, user as unknown as Record<string, unknown>);
  return user;
}
