import { fetchCollectionDocs, saveDocument } from "./firebase-db";
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

export async function saveApplication(application: Application): Promise<void> {
  const record = { ...application, status: application.status ?? "pending" };
  await saveDocument(COLLECTION, application.id, record as unknown as Record<string, unknown>);
}

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<Application | null> {
  await saveDocument(COLLECTION, id, { status });
  const apps = await getApplications();
  return apps.find((a) => a.id === id) || null;
}
