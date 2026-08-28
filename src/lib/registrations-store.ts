import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";
import type { EventRegistration } from "./registrations";

const COLLECTION = "event_registrations";

export function registrationDocId(eventId: string, email: string): string {
  const cleanEvent = eventId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `${cleanEvent}__${cleanEmail}`;
}

export async function getRegistrations(eventId?: string): Promise<EventRegistration[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as EventRegistration[];
  const filtered = eventId && eventId.trim()
    ? items.filter((r) => r.eventId === eventId.trim())
    : items;

  return filtered.sort(
    (a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()
  );
}

export async function getRegistrationById(id: string): Promise<EventRegistration | null> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as EventRegistration[];
  return items.find((r) => r.id === id || registrationDocId(r.eventId, r.collegeMail) === id) || null;
}

export async function findRegistration(
  eventId: string,
  email: string
): Promise<EventRegistration | null> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as EventRegistration[];
  const targetEmail = email.trim().toLowerCase();
  const targetEvent = eventId.trim();

  return (
    items.find(
      (r) =>
        (r.collegeMail || "").trim().toLowerCase() === targetEmail &&
        r.eventId === targetEvent &&
        r.status !== "cancelled"
    ) || null
  );
}

export async function saveRegistration(
  reg: EventRegistration,
  token?: string | null
): Promise<void> {
  const docId = reg.id || registrationDocId(reg.eventId, reg.collegeMail);
  await saveDocument(COLLECTION, docId, { ...reg, id: docId } as unknown as Record<string, unknown>, token);
}

export async function updateRegistrationStatus(
  id: string,
  patch: Partial<EventRegistration>,
  token?: string | null
): Promise<EventRegistration | null> {
  await saveDocument(COLLECTION, id, patch as unknown as Record<string, unknown>, token);
  return getRegistrationById(id);
}

export async function deleteRegistration(
  id: string,
  token?: string | null
): Promise<boolean> {
  return deleteDocument(COLLECTION, id, token);
}
