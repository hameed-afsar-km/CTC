import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getGalleryItems,
  addGalleryItem,
  deleteGalleryItem,
  getGalleryItem,
} from "@/lib/gallery-store";
import type { GalleryItem } from "@/lib/gallery-store";
import { deleteCloudinaryImage, publicIdFromCloudinaryUrl } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    const items = await getGalleryItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/admin/gallery error:", err);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<GalleryItem>;
    if (!body.imageUrl || !body.title) {
      return NextResponse.json({ error: "imageUrl and title are required" }, { status: 400 });
    }
    const item: GalleryItem = {
      id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      imageUrl: body.imageUrl,
      title: String(body.title).trim(),
      category: String(body.category ?? "").trim(),
      description: String(body.description ?? "").trim(),
      date: String(body.date ?? new Date().toISOString().slice(0, 10)),
      createdAt: new Date().toISOString(),
    };
    await addGalleryItem(item);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const item = await getGalleryItem(id);
  if (!item) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }
  const publicId = publicIdFromCloudinaryUrl(item.imageUrl);
  if (publicId) {
    await deleteCloudinaryImage(publicId);
  }
  await deleteGalleryItem(id);
  return NextResponse.json({ ok: true });
}
