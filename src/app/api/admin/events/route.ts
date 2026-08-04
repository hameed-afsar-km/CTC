import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getEvents,
  saveEvent,
  updateEvent,
  deleteEvent,
  getEventById,
} from "@/lib/events-store";
import type { ClubEvent } from "@/lib/events";
import { deleteCloudinaryImage, publicIdFromCloudinaryUrl } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const events = await getEvents();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<ClubEvent>;
    if (!body.title || !body.date) {
      return NextResponse.json({ error: "title and date are required" }, { status: 400 });
    }
    const event: ClubEvent = {
      id: body.id ?? `evt-${Date.now()}`,
      title: body.title,
      description: body.description ?? "",
      image: body.image ?? "/assets/hero_3d.png",
      category: body.category ?? "Event",
      venue: body.venue ?? "Crescent Campus",
      date: body.date,
      registerUrl: body.registerUrl ?? "#",
    };
    await saveEvent(event);
    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as ClubEvent;
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const existing = await getEventById(body.id);
    if (!existing) {
      return NextResponse.json({ error: "event not found" }, { status: 404 });
    }
    if (body.image && body.image !== existing.image) {
      const oldPublicId = publicIdFromCloudinaryUrl(existing.image);
      if (oldPublicId) {
        await deleteCloudinaryImage(oldPublicId);
      }
    }
    const updated = await updateEvent(body.id, body);
    return NextResponse.json({ event: updated });
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
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }
  const publicId = publicIdFromCloudinaryUrl(event.image);
  if (publicId) {
    await deleteCloudinaryImage(publicId);
  }
  await deleteEvent(id);
  return NextResponse.json({ ok: true });
}
