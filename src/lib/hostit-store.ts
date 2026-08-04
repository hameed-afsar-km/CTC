import { getDb } from "./firebase-admin";

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
  const snapshot = await getDb().collection(COLLECTION).orderBy("submittedAt", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as HostitSubmission);
}

export async function saveHostitSubmission(submission: HostitSubmission): Promise<void> {
  await getDb().collection(COLLECTION).doc(submission.id).set(submission);
}

export async function updateHostitStatus(id: string, status: SubmissionStatus): Promise<HostitSubmission | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.update({ status });
  const updated = await ref.get();
  return updated.data() as HostitSubmission;
}
