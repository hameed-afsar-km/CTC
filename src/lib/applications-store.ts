import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";
import { syncAppliedRole } from "./users-store";
import type { Application } from "./applications";

const COLLECTION = "applications";

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
  const target = email.trim().toLowerCase();
  return (
    items.find(
      (a) => (a.collegeMail || "").trim().toLowerCase() === target
    ) || null
  );
}

export async function saveApplication(application: Application): Promise<void> {
  const record = { ...application, status: application.status ?? "pending" };
  await saveDocument(COLLECTION, application.id, record as unknown as Record<string, unknown>);
}

export async function updateApplicationStatus(
  id: string,
  status: string,
  rejectionReason?: string
): Promise<Application | null> {
  const record: Record<string, unknown> = { status };
  if (status === "rejected") {
    record.rejectionReason = rejectionReason?.trim() ?? "";
  } else {
    record.rejectionReason = "";
  }
  await saveDocument(COLLECTION, id, record);
  const apps = await getApplications();
  const updated = apps.find((a) => a.id === id) || null;
  if (updated) {
    await syncAppliedRole(
      updated.collegeMail,
      updated.fullName,
      updated.role || "member",
      status === "approved"
    );
  }
  return updated;
}

export async function updateApplication(
  id: string,
  patch: Partial<Application>
): Promise<Application | null> {
  const rest: Partial<Application> = { ...patch };
  delete rest.id;
  const record: Record<string, unknown> = { ...rest };
  if (rest.status) record.status = rest.status;
  await saveDocument(COLLECTION, id, record);
  const apps = await getApplications();
  const updated = apps.find((a) => a.id === id) || null;
  if (updated && rest.status) {
    await syncAppliedRole(
      updated.collegeMail,
      updated.fullName,
      updated.role || "member",
      rest.status === "approved"
    );
  }
  return updated;
}

export async function deleteApplication(id: string): Promise<boolean> {
  return deleteDocument(COLLECTION, id);
}
