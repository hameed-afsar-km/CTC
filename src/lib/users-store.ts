import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";
import type { ScopePermissions } from "./roles";

export interface UserProfile {
  degree?: string;
  department?: string;
  branch?: string;
  section?: string;
  year?: string;
  contactNumber?: string;
}

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
  permissions?: ScopePermissions;
  profile?: UserProfile;
}

const COLLECTION = "users";

// Strips empty values so blank form fields never overwrite known profile data.
function cleanProfile(profile?: UserProfile): UserProfile | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const out: UserProfile = {};
  let hasAny = false;
  for (const [key, value] of Object.entries(profile)) {
    const v = typeof value === "string" ? value.trim() : "";
    if (v) {
      out[key as keyof UserProfile] = v;
      hasAny = true;
    }
  }
  return hasAny ? out : undefined;
}

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

export async function upsertUser(
  input: {
    email: string;
    name: string;
    source: string;
  },
  token?: string | null
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const existing = await getUser(email);
  const now = new Date().toISOString();
  if (existing) {
    await saveDocument(
      COLLECTION,
      email,
      {
        name: existing.name || input.name,
        sources: Array.from(new Set([...(existing.sources ?? []), input.source])),
        updatedAt: now,
      },
      token
    );
  } else {
    await saveDocument(
      COLLECTION,
      email,
      {
        email,
        name: input.name,
        roles: [],
        sources: [input.source],
        createdAt: now,
        updatedAt: now,
      },
      token
    );
  }
}

export async function setUserRoles(
  email: string,
  roles: string[],
  token?: string | null
): Promise<SiteUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(COLLECTION, cleanEmail, { roles, updatedAt: now }, token);
  return { ...existing, roles, updatedAt: now };
}

export async function revokeJoinLimit(
  email: string,
  token?: string | null
): Promise<SiteUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(COLLECTION, cleanEmail, { joinResetAt: now, updatedAt: now }, token);
  return { ...existing, joinResetAt: now, updatedAt: now };
}

export async function clearJoinReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await saveDocument(COLLECTION, cleanEmail, {
    joinResetAt: null,
    updatedAt: new Date().toISOString(),
  });
}

export async function createUser(
  input: {
    name: string;
    email: string;
    roles?: string[];
    profile?: UserProfile;
  },
  token?: string | null
): Promise<SiteUser> {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const user: SiteUser = {
    email,
    name: input.name.trim(),
    roles: input.roles ?? [],
    sources: [],
    createdAt: now,
    updatedAt: now,
    profile: cleanProfile(input.profile),
  };
  await saveDocument(COLLECTION, email, user as unknown as Record<string, unknown>, token);
  return user;
}

export async function deleteUser(
  email: string,
  token?: string | null
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  return deleteDocument(COLLECTION, cleanEmail, token);
}

export async function updateUser(
  oldEmail: string,
  patch: Partial<SiteUser>,
  token?: string | null
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
    permissions:
      patch.permissions && typeof patch.permissions === "object"
        ? { ...patch.permissions }
        : existing.permissions,
    profile:
      cleanProfile(patch.profile) ?? (existing.profile ? { ...existing.profile } : undefined),
    createdAt: existing.createdAt,
    updatedAt: now,
    joinResetAt: existing.joinResetAt,
  };

  await saveDocument(COLLECTION, nextEmail, updated as unknown as Record<string, unknown>, token);
  if (nextEmail !== currentEmail) {
    await deleteDocument(COLLECTION, currentEmail, token);
  }
  return updated;
}

export async function setUserPermissions(
  email: string,
  permissions: ScopePermissions,
  token?: string | null
): Promise<SiteUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(COLLECTION, cleanEmail, { permissions, updatedAt: now }, token);
  return { ...existing, permissions, updatedAt: now };
}

export async function syncAppliedRole(
  email: string,
  name: string,
  role: string,
  shouldHaveRole: boolean,
  profile?: UserProfile,
  token?: string | null
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = String(role || "").trim().toLowerCase();
  if (!cleanEmail || !cleanRole) return;
  const existing = await getUser(cleanEmail);
  const roles = existing?.roles ?? [];
  const hasRole = roles.includes(cleanRole);
  const nextProfile = cleanProfile({
    ...(existing?.profile ?? {}),
    ...(profile ?? {}),
  });

  if (!existing) {
    if (!shouldHaveRole) return;
    await createUser(
      { name: name.trim(), email: cleanEmail, roles: [cleanRole], profile: nextProfile },
      token
    );
    return;
  }

  if (!shouldHaveRole && !hasRole) {
    // Status change without a role delta — still keep the academic profile fresh.
    if (nextProfile && JSON.stringify(nextProfile) !== JSON.stringify(existing.profile)) {
      await saveDocument(
        COLLECTION,
        cleanEmail,
        { profile: nextProfile, updatedAt: new Date().toISOString() },
        token
      );
    }
    return;
  }

  if (shouldHaveRole && !hasRole) {
    await saveDocument(
      COLLECTION,
      cleanEmail,
      { roles: [...roles, cleanRole], updatedAt: new Date().toISOString() },
      token
    );
    if (nextProfile && JSON.stringify(nextProfile) !== JSON.stringify(existing.profile)) {
      await saveDocument(COLLECTION, cleanEmail, { profile: nextProfile }, token);
    }
  } else if (!shouldHaveRole && hasRole) {
    await setUserRoles(
      cleanEmail,
      roles.filter((r) => r !== cleanRole),
      token
    );
  }
}

// Records the hash + version of a member's QR code. Only the hash is stored —
// the raw code is reconstructed server-side via the shared secret.
export async function saveMemberCode(
  email: string,
  codeHash: string,
  version: number,
  token?: string | null
): Promise<SiteUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await getUser(cleanEmail);
  if (!existing) return null;
  const now = new Date().toISOString();
  await saveDocument(
    COLLECTION,
    cleanEmail,
    {
      memberCodeHash: codeHash,
      memberCodeVersion: version,
      memberCodeIssuedAt: now,
      updatedAt: now,
    },
    token
  );
  return { ...existing, memberCodeHash: codeHash, memberCodeVersion: version, memberCodeIssuedAt: now, updatedAt: now };
}

// Issued (bumped) version for a fresh code: 1 if none was issued before,
// otherwise the next version — which revokes every older code.
export function nextMemberCodeVersion(user: Pick<SiteUser, "memberCodeVersion"> | null): number {
  return (user?.memberCodeVersion ?? 0) + 1;
}
