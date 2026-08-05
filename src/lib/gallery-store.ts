import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  category: string;
  description: string;
  date: string;
  createdAt: string;
  eventId?: string;
  label?: string;
}

const COLLECTION = "gallery";

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as GalleryItem[];
  return items.sort(
    (a, b) =>
      new Date(b.createdAt || b.date).getTime() -
      new Date(a.createdAt || a.date).getTime()
  );
}

export async function getGalleryItemsByEvent(
  eventId: string
): Promise<GalleryItem[]> {
  const items = await getGalleryItems();
  return items.filter((i) => i.eventId === eventId);
}

export async function addGalleryItem(item: GalleryItem, token?: string | null): Promise<void> {
  await saveDocument(COLLECTION, item.id, item as unknown as Record<string, unknown>, token);
}

export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
  const items = await getGalleryItems();
  return items.find((i) => i.id === id) || null;
}

export async function updateGalleryItem(
  id: string,
  patch: Partial<GalleryItem>,
  token?: string | null
): Promise<GalleryItem | null> {
  const rest: Partial<GalleryItem> = { ...patch };
  delete rest.id;
  await saveDocument(COLLECTION, id, rest as unknown as Record<string, unknown>, token);
  return getGalleryItem(id);
}

export async function deleteGalleryItem(id: string, token?: string | null): Promise<boolean> {
  return deleteDocument(COLLECTION, id, token);
}
