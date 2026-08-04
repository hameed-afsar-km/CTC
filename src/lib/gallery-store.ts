import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  category: string;
  description: string;
  date: string;
  createdAt: string;
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

export async function addGalleryItem(item: GalleryItem): Promise<void> {
  await saveDocument(COLLECTION, item.id, item as unknown as Record<string, unknown>);
}

export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
  const items = await getGalleryItems();
  return items.find((i) => i.id === id) || null;
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  return deleteDocument(COLLECTION, id);
}
