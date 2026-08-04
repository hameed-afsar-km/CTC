import { getDb } from "./firebase-admin";
import type { ClubEvent } from "./events";

const COLLECTION = "events";

export async function getEvents(): Promise<ClubEvent[]> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).orderBy("date", "asc").get();
  return snapshot.docs.map((doc) => doc.data() as ClubEvent);
}

export async function saveEvent(event: ClubEvent): Promise<void> {
  await getDb().collection(COLLECTION).doc(event.id).set(event);
}

export async function updateEvent(id: string, patch: Partial<ClubEvent>): Promise<ClubEvent | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.update(patch);
  const updated = await ref.get();
  return updated.data() as ClubEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

export async function getEventById(id: string): Promise<ClubEvent | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  return doc.data() as ClubEvent;
}
