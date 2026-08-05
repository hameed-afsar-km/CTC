import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import {
  getGalleryItems,
  addGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getGalleryItem,
} from "@/lib/gallery-store";
import type { GalleryItem } from "@/lib/gallery-store";
import { deleteCloudinaryImage, publicIdFromCloudinaryUrl } from "@/lib/cloudinary";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveAccess(request, "gallery");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const items = await getGalleryItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/admin/gallery error:", err);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  const access = await resolveAccess(request, "gallery");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const body = (await request.json()) as Partial<GalleryItem>;
    if (!body.imageUrl || !body.title) {
      return NextResponse.json({ error: "imageUrl and title are required" }, { status: 400 });
    }
    const token = bearerToken(request);
    const item: GalleryItem = {
      id: body.id || `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      imageUrl: body.imageUrl,
      title: String(body.title).trim(),
      category: String(body.category ?? "").trim(),
      description: String(body.description ?? "").trim(),
      date: String(body.date ?? new Date().toISOString().slice(0, 10)),
      createdAt: body.createdAt || new Date().toISOString(),
      eventId: body.eventId ? String(body.eventId) : undefined,
      label: String(body.label ?? "").trim(),
    };
    await addGalleryItem(item, token);
    await logAction(
      request,
      access.session,
      "gallery",
      "add photo",
      `Added gallery photo "${item.title}"`
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save gallery item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const access = await resolveAccess(request, "gallery");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const body = (await request.json()) as Partial<GalleryItem>;
    const patch: Partial<GalleryItem> = {};
    if (typeof body.label === "string") patch.label = body.label.trim();
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.category === "string") patch.category = body.category.trim();
    if (typeof body.description === "string") patch.description = body.description.trim();
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no updatable fields provided" }, { status: 400 });
    }
    const token = bearerToken(request);
    const updated = await updateGalleryItem(id, patch, token);
    if (!updated) {
      return NextResponse.json({ error: "item not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "gallery",
      "update photo",
      `Updated gallery photo "${updated.title}"`
    );
    return NextResponse.json({ item: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update gallery item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "gallery");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const token = bearerToken(request);
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
  await deleteGalleryItem(id, token);
  await logAction(
    request,
    access.session,
    "gallery",
    "delete photo",
    `Deleted gallery photo "${item.title}"`
  );
  return NextResponse.json({ ok: true });
}
