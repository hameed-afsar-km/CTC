import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";
import type { ClubEvent } from "./events";

const COLLECTION = "events";

export async function getEvents(): Promise<ClubEvent[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as ClubEvent[];
  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function saveEvent(event: ClubEvent, token?: string | null): Promise<void> {
  await saveDocument(COLLECTION, event.id, event as unknown as Record<string, unknown>, token);
}

export async function updateEvent(id: string, patch: Partial<ClubEvent>, token?: string | null): Promise<ClubEvent | null> {
  await saveDocument(COLLECTION, id, patch as unknown as Record<string, unknown>, token);
  return getEventById(id);
}

export async function deleteEvent(id: string, token?: string | null): Promise<boolean> {
  return deleteDocument(COLLECTION, id, token);
}

export async function getEventById(id: string): Promise<ClubEvent | null> {
  const events = await getEvents();
  return events.find((e) => e.id === id) || null;
}
