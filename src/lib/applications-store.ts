import { getDb } from "./firebase-admin";
import type { Application } from "./applications";

const COLLECTION = "applications";

export async function getApplications(): Promise<Application[]> {
  const db = getDb();
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION).orderBy("submittedAt", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as Application);
}

export async function saveApplication(application: Application): Promise<void> {
  const db = getDb();
  if (!db) return;
  const record = { ...application, status: application.status ?? "pending" };
  await db.collection(COLLECTION).doc(application.id).set(record);
}

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<Application | null> {
  const db = getDb();
  if (!db) return null;
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.update({ status });
  const updated = await ref.get();
  return updated.data() as Application;
}
