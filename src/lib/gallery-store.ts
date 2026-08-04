import { getDb } from "./firebase-admin";

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
  const snapshot = await getDb().collection(COLLECTION).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as GalleryItem);
}

export async function addGalleryItem(item: GalleryItem): Promise<void> {
  await getDb().collection(COLLECTION).doc(item.id).set(item);
}

export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  return doc.data() as GalleryItem;
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
