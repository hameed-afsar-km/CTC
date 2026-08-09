import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";

export interface SiteUser {
  email: string;
  name: string;
  roles: string[];
  sources: string[];
  createdAt: string;
  updatedAt: string;
  joinResetAt?: string;
  memberCodeHash?: string;
  memberCodeVersion?: number;
  memberCodeIssuedAt?: string;
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

export async function revokeJoinLimit(email: string): Promise<SiteUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(COLLECTION, cleanEmail, { joinResetAt: now, updatedAt: now });
  return { ...existing, joinResetAt: now, updatedAt: now };
}

export async function clearJoinReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await saveDocument(COLLECTION, cleanEmail, {
    joinResetAt: null,
    updatedAt: new Date().toISOString(),
  });
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

export async function deleteUser(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  return deleteDocument(COLLECTION, cleanEmail);
}

export async function updateUser(
  oldEmail: string,
  patch: Partial<SiteUser>
): Promise<SiteUser | null> {
  const currentEmail = oldEmail.trim().toLowerCase();
  const nextEmail = (patch.email?.trim().toLowerCase() || currentEmail).toLowerCase();
  const existing = await getUser(currentEmail);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: SiteUser = {
    email: nextEmail,
    name: patch.name?.trim() || existing.name,
    roles: Array.isArray(patch.roles)
      ? Array.from(new Set(patch.roles.map((r) => String(r).trim()).filter(Boolean)))
      : existing.roles,
    sources: Array.isArray(patch.sources)
      ? Array.from(new Set(patch.sources.map((s) => String(s).trim()).filter(Boolean)))
      : existing.sources,
    createdAt: existing.createdAt,
    updatedAt: now,
    joinResetAt: existing.joinResetAt,
  };

  await saveDocument(COLLECTION, nextEmail, updated as unknown as Record<string, unknown>);
  if (nextEmail !== currentEmail) {
    await deleteDocument(COLLECTION, currentEmail);
  }
  return updated;
}

export async function syncAppliedRole(
  email: string,
  name: string,
  role: string,
  shouldHaveRole: boolean
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = String(role || "").trim().toLowerCase();
  if (!cleanEmail || !cleanRole) return;
  const existing = await getUser(cleanEmail);
  const roles = existing?.roles ?? [];
  const hasRole = roles.includes(cleanRole);

  if (!existing) {
    if (!shouldHaveRole) return;
    await createUser({ name: name.trim(), email: cleanEmail, roles: [cleanRole] });
    return;
  }

  if (shouldHaveRole && !hasRole) {
    await setUserRoles(cleanEmail, [...roles, cleanRole]);
  } else if (!shouldHaveRole && hasRole) {
    await setUserRoles(cleanEmail, roles.filter((r) => r !== cleanRole));
  }
}

// Records the hash + version of a member's QR code. Only the hash is stored —
// the raw code is reconstructed server-side via the shared secret.
export async function saveMemberCode(
  email: string,
  codeHash: string,
  version: number
): Promise<SiteUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(COLLECTION, cleanEmail, {
    memberCodeHash: codeHash,
    memberCodeVersion: version,
    memberCodeIssuedAt: now,
    updatedAt: now,
  });
  return { ...existing, memberCodeHash: codeHash, memberCodeVersion: version, memberCodeIssuedAt: now, updatedAt: now };
}

// Issued (bumped) version for a fresh code: 1 if none was issued before,
// otherwise the next version — which revokes every older code.
export function nextMemberCodeVersion(user: Pick<SiteUser, "memberCodeVersion"> | null): number {
  return (user?.memberCodeVersion ?? 0) + 1;
}
