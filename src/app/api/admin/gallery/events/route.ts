import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import {
  getGalleryEventFolders,
  addGalleryEventFolder,
  getGalleryEventFolder,
  deleteGalleryEventFolder,
} from "@/lib/gallery-events-store";
import type { GalleryEventFolder } from "@/lib/gallery-events-store";
import {
  getGalleryItemsByEvent,
  deleteGalleryItem,
} from "@/lib/gallery-store";
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
    const events = await getGalleryEventFolders();
    return NextResponse.json({ events });
  } catch (err) {
    console.error("GET /api/admin/gallery/events error:", err);
    return NextResponse.json({ events: [] });
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
    const body = (await request.json()) as Partial<GalleryEventFolder>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "event name is required" }, { status: 400 });
    }
    const token = bearerToken(request);
    const folder: GalleryEventFolder = {
      id: body.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      category: String(body.category ?? "").trim(),
      description: String(body.description ?? "").trim(),
      date: String(body.date ?? new Date().toISOString().slice(0, 10)),
      createdAt: body.createdAt || new Date().toISOString(),
    };
    await addGalleryEventFolder(folder, token);
    await logAction(
      request,
      access.session,
      "gallery",
      "create event folder",
      `Created gallery event folder "${name}"`
    );
    return NextResponse.json({ event: folder }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create event folder";
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
  const folder = await getGalleryEventFolder(id);
  if (!folder) {
    return NextResponse.json({ error: "event folder not found" }, { status: 404 });
  }

  const items = await getGalleryItemsByEvent(id);
  let deleted = 0;
  for (const item of items) {
    try {
      const publicId = publicIdFromCloudinaryUrl(item.imageUrl);
      if (publicId) {
        await deleteCloudinaryImage(publicId);
      }
      await deleteGalleryItem(item.id, token);
      deleted++;
    } catch {
      // keep going — delete as many as possible
    }
  }
  await deleteGalleryEventFolder(id, token);
  await logAction(
    request,
    access.session,
    "gallery",
    "delete event folder",
    `Deleted gallery event folder "${folder.name}" (${deleted} photos removed)`
  );
  return NextResponse.json({ ok: true, deleted });
}
