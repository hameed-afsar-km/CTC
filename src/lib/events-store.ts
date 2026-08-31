import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";
import type { ClubEvent } from "./events";

const COLLECTION = "events";

export async function getEvents(): Promise<ClubEvent[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as ClubEvent[];
  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function removeDeadlineField(eventId: string): Promise<void> {
  try {
    const { getAdminDb } = await import("./firebase-admin");
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection(COLLECTION).doc(eventId).update({
        registrationDeadline: (await import("firebase-admin/firestore")).FieldValue.delete(),
      });
      return;
    }
  } catch {}
  try {
    const { getFirestore, doc, updateDoc, deleteField } = await import("firebase/firestore");
    const db = getFirestore();
    await updateDoc(doc(db, COLLECTION, eventId), {
      registrationDeadline: deleteField(),
    });
  } catch {}
}

export async function saveEvent(event: ClubEvent, token?: string | null): Promise<void> {
  const { registrationDeadline, ...rest } = event;
  const data: Record<string, unknown> = { ...rest };
  if (registrationDeadline) {
    data.registrationDeadline = registrationDeadline;
  }
  await saveDocument(COLLECTION, event.id, data, token);
  if (registrationDeadline === null || registrationDeadline === undefined) {
    await removeDeadlineField(event.id);
  }
}

export async function updateEvent(id: string, patch: Partial<ClubEvent>, token?: string | null): Promise<ClubEvent | null> {
  const { registrationDeadline, ...rest } = patch;
  const data: Record<string, unknown> = { ...rest };
  if (registrationDeadline) {
    data.registrationDeadline = registrationDeadline;
  }
  await saveDocument(COLLECTION, id, data, token);
  if (registrationDeadline === null || registrationDeadline === undefined) {
    await removeDeadlineField(id);
  }
  return getEventById(id);
}

export async function deleteEvent(id: string, token?: string | null): Promise<boolean> {
  return deleteDocument(COLLECTION, id, token);
}

import { defaultEvents } from "./events";

export async function getEventById(id: string): Promise<ClubEvent | null> {
  const events = await getEvents();
  const found = events.find((e) => e.id === id);
  if (found) return found;
  return defaultEvents.find((e) => e.id === id) || null;
}

export async function getEventBySlugOrId(slugOrId: string): Promise<ClubEvent | null> {
  const clean = slugOrId.trim().toLowerCase();
  const events = await getEvents();
  const allEvents = events.length > 0 ? events : defaultEvents;
  return (
    allEvents.find(
      (e) => (e.slug && e.slug.toLowerCase() === clean) || e.id.toLowerCase() === clean
    ) || null
  );
}
