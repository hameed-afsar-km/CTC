import { fetchCollectionDocs, saveDocument } from "./firebase-db";

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

export async function saveHostitSubmission(submission: HostitSubmission): Promise<void> {
  await saveDocument(COLLECTION, submission.id, submission as unknown as Record<string, unknown>);
}

export async function updateHostitStatus(
  id: string,
  status: SubmissionStatus
): Promise<HostitSubmission | null> {
  await saveDocument(COLLECTION, id, { status });
  const subs = await getHostitSubmissions();
  return subs.find((s) => s.id === id) || null;
}
