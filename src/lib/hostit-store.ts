import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface HostitSubmission {
  id: string;
  eventType: string;
  organizerName: string;
  email: string;
  contactNumber: string;
  degree: string;
  department: string;
  section: string;
  year: string;
  expectedAttendees: string;
  description: string;
  proposedDate: string;
  status: SubmissionStatus;
  submittedAt: string;
  rejectionReason?: string;
}

const COLLECTION = "hostit";

export async function getHostitSubmissions(): Promise<HostitSubmission[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as HostitSubmission[];
  return items.sort(
    (a, b) =>
      new Date(b.submittedAt || 0).getTime() -
      new Date(a.submittedAt || 0).getTime()
  );
}

export async function findHostitSubmissionByEmail(
  email: string
): Promise<HostitSubmission | null> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as HostitSubmission[];
  const target = email.trim().toLowerCase();
  return (
    items.find((s) => (s.email || "").trim().toLowerCase() === target) || null
  );
}

export async function saveHostitSubmission(submission: HostitSubmission): Promise<void> {
  await saveDocument(COLLECTION, submission.id, submission as unknown as Record<string, unknown>);
}

export async function updateHostitStatus(
  id: string,
  status: SubmissionStatus,
  rejectionReason?: string
): Promise<HostitSubmission | null> {
  const record: Record<string, unknown> = { status };
  if (status === "rejected") {
    record.rejectionReason = rejectionReason?.trim() ?? "";
  } else {
    record.rejectionReason = "";
  }
  await saveDocument(COLLECTION, id, record);
  const subs = await getHostitSubmissions();
  return subs.find((s) => s.id === id) || null;
}

export async function updateHostitSubmission(
  id: string,
  patch: Partial<HostitSubmission>
): Promise<HostitSubmission | null> {
  const rest: Partial<HostitSubmission> = { ...patch };
  delete rest.id;
  const record: Record<string, unknown> = { ...rest };
  if (rest.status) record.status = rest.status;
  await saveDocument(COLLECTION, id, record);
  const subs = await getHostitSubmissions();
  return subs.find((s) => s.id === id) || null;
}

export async function deleteHostitSubmission(id: string): Promise<boolean> {
  return deleteDocument(COLLECTION, id);
}
