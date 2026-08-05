import { fetchCollectionDocs, saveDocument, deleteDocument } from "./firebase-db";

export interface GalleryEventFolder {
  id: string;
  name: string;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

const COLLECTION = "galleryEvents";

export async function getGalleryEventFolders(): Promise<GalleryEventFolder[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const items = docs as unknown as GalleryEventFolder[];
  return items.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );
}

export async function addGalleryEventFolder(
  folder: GalleryEventFolder,
  token?: string | null
): Promise<void> {
  await saveDocument(
    COLLECTION,
    folder.id,
    folder as unknown as Record<string, unknown>,
    token
  );
}

export async function getGalleryEventFolder(
  id: string
): Promise<GalleryEventFolder | null> {
  const items = await getGalleryEventFolders();
  return items.find((f) => f.id === id) || null;
}

export async function deleteGalleryEventFolder(
  id: string,
  token?: string | null
): Promise<boolean> {
  return deleteDocument(COLLECTION, id, token);
}
