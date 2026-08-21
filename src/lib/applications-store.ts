import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";
import {
  getUser,
  nextMemberCodeVersion,
  saveMemberCode,
  syncAppliedRole,
  type UserProfile,
} from "./users-store";
import { buildMemberCode, hashMemberCode } from "./member-codes";
import type { Application } from "./applications";

const COLLECTION = "applications";

// The most recent application for an email (used to prefill re-applications
// and to enrich user records with academic profile data).
function latestOf(items: Application[], email: string): Application | null {
  const target = email.trim().toLowerCase();
  return (
    items
      .filter((a) => (a.collegeMail || "").trim().toLowerCase() === target)
      .sort(
        (a, b) =>
          new Date(b.submittedAt || 0).getTime() -
          new Date(a.submittedAt || 0).getTime()
      )[0] || null
  );
}

export async function getApplications(): Promise<Application[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as Application[];
  return items.sort(
    (a, b) =>
      new Date(b.submittedAt || 0).getTime() -
      new Date(a.submittedAt || 0).getTime()
  );
}

export async function findApplicationByEmail(
  email: string
): Promise<Application | null> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as Application[];
  return latestOf(items, email);
}

// True when the email already has an unresolved application. This is the
// single anti-spam / anti-redundancy gate for both join and role requests:
// a member may only have one pending application at a time. Resolved
// (approved/rejected) applications never block a future application.
export async function hasPendingApplication(email: string): Promise<boolean> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as Application[];
  const target = email.trim().toLowerCase();
  return items.some(
    (a) =>
      (a.collegeMail || "").trim().toLowerCase() === target &&
      (a.status ?? "pending") === "pending"
  );
}

// Whether the once-per-email limit still blocks this address. If an admin has
// revoked the limit (joinResetAt), applications submitted before that reset
// no longer count — the person may apply again exactly once.
export async function hasActiveApplicationLimit(
  email: string,
  resetAt?: string | null
): Promise<boolean> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as Application[];
  const target = email.trim().toLowerCase();
  const matches = items.filter(
    (a) => (a.collegeMail || "").trim().toLowerCase() === target
  );
  if (matches.length === 0) return false;
  if (!resetAt) return true;
  const resetTime = new Date(resetAt).getTime();
  if (!Number.isFinite(resetTime)) return true;
  return matches.some(
    (a) => new Date(a.submittedAt || 0).getTime() > resetTime
  );
}

export async function findLatestApplicationByEmail(
  email: string
): Promise<Application | null> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as Application[];
  return latestOf(items, email);
}

// Academic/contact profile carried over from an application — stored on the
// user record so the dashboard can classify members by year, branch, etc.
export function profileFromApplication(app: Application): UserProfile {
  const clean = (v?: string) => (v ?? "").trim();
  return {
    degree: clean(app.degree),
    department: clean(app.department),
    branch: clean(app.branch),
    section: clean(app.section),
    year: clean(app.year),
    contactNumber: clean(app.contactNumber),
  };
}

export async function saveApplication(
  application: Application,
  token?: string | null
): Promise<void> {
  const record = { ...application, status: application.status ?? "pending" };
  await saveDocument(
    COLLECTION,
    application.id,
    record as unknown as Record<string, unknown>,
    token
  );
}

// Issue (or keep) a member's QR code. Called only when an application is
// approved so a code exists by the time the member tries to open their card.
export async function ensureMemberCode(
  email: string,
  token?: string | null
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return;
  const user = await getUser(cleanEmail);
  if (!user) return;
  if (user.memberCodeHash && user.memberCodeVersion) return;
  const version = nextMemberCodeVersion(user);
  const code = buildMemberCode(cleanEmail, version);
  await saveMemberCode(cleanEmail, hashMemberCode(code), version, token);
}

export async function updateApplicationStatus(
  id: string,
  status: string,
  rejectionReason?: string,
  token?: string | null
): Promise<Application | null> {
  const record: Record<string, unknown> = { status };
  if (status === "rejected") {
    record.rejectionReason = rejectionReason?.trim() ?? "";
  } else {
    record.rejectionReason = "";
  }
  await saveDocument(COLLECTION, id, record, token);
  const apps = await getApplications();
  const updated = apps.find((a) => a.id === id) || null;
  if (updated) {
    await syncAppliedRole(
      updated.collegeMail,
      updated.fullName,
      updated.role || "member",
      status === "approved",
      profileFromApplication(updated),
      token
    );
    if (status === "approved") {
      await ensureMemberCode(updated.collegeMail, token);
    }
  }
  return updated;
}

export async function updateApplication(
  id: string,
  patch: Partial<Application>,
  token?: string | null
): Promise<Application | null> {
  const rest: Partial<Application> = { ...patch };
  delete rest.id;
  const record: Record<string, unknown> = { ...rest };
  if (rest.status) record.status = rest.status;
  await saveDocument(COLLECTION, id, record, token);
  const apps = await getApplications();
  const updated = apps.find((a) => a.id === id) || null;
  if (updated && rest.status) {
    await syncAppliedRole(
      updated.collegeMail,
      updated.fullName,
      updated.role || "member",
      rest.status === "approved",
      profileFromApplication(updated),
      token
    );
    if (rest.status === "approved") {
      await ensureMemberCode(updated.collegeMail, token);
    }
  }
  return updated;
}

export async function deleteApplication(
  id: string,
  token?: string | null
): Promise<boolean> {
  return deleteDocument(COLLECTION, id, token);
}
