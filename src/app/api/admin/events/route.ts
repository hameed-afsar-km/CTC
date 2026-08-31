import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import {
  getEvents,
  saveEvent,
  updateEvent,
  deleteEvent,
  getEventById,
} from "@/lib/events-store";
import type { ClubEvent } from "@/lib/events";
import { deleteCloudinaryImage, publicIdFromCloudinaryUrl } from "@/lib/cloudinary";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveAccess(request, "events");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (err) {
    console.error("GET /api/admin/events error:", err);
    return NextResponse.json({ events: [] });
  }
}

export async function POST(request: Request) {
  const access = await resolveAccess(request, "events");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const token = bearerToken(request);
    const body = (await request.json()) as Partial<ClubEvent>;
    if (!body.title || !body.date) {
      return NextResponse.json({ error: "title and date are required" }, { status: 400 });
    }
    const slug = (body.slug || "").trim() || (body.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : `evt-${Date.now()}`);
    const registrationMode = body.registrationMode === "external" ? "external" : "inbuilt";
    const registerUrl = registrationMode === "inbuilt"
      ? `/events/${slug}/register`
      : (body.registerUrl ?? "#");

    const event: ClubEvent = {
      id: body.id ?? slug,
      title: body.title,
      slug,
      description: body.description ?? "",
      image: body.image ?? "/assets/hero_3d.png",
      category: body.category ?? "Event",
      venue: body.venue ?? "Crescent Campus",
      date: body.date,
      registrationMode,
      registerUrl,
      registrationDeadline:
        typeof body.registrationDeadline === "string" && body.registrationDeadline.trim()
          ? body.registrationDeadline
          : body.registrationDeadline === null
            ? null
            : undefined,
      featured: body.featured === true,
      contactName: typeof body.contactName === "string" ? body.contactName : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone : undefined,
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      dos: Array.isArray(body.dos) ? body.dos : [],
      donts: Array.isArray(body.donts) ? body.donts : [],
      schedule: Array.isArray(body.schedule) ? body.schedule : [],
      customFields: Array.isArray(body.customFields) ? body.customFields : [],
    };
    await saveEvent(event, token);
    await logAction(
      request,
      access.session,
      "events",
      "create event",
      `Created event "${event.title}" (${event.date})`
    );
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save event";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "events");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const token = bearerToken(request);
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
    const updated = await updateEvent(body.id, body, token);
    if (!updated) {
      return NextResponse.json({ error: "event update failed" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "events",
      "update event",
      `Updated event "${updated.title}"`
    );
    return NextResponse.json({ event: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update event";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "events");
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
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }
  const publicId = publicIdFromCloudinaryUrl(event.image);
  if (publicId) {
    await deleteCloudinaryImage(publicId);
  }
  await deleteEvent(id, token);
  await logAction(
    request,
    access.session,
    "events",
    "delete event",
    `Deleted event "${event.title}"`
  );
  return NextResponse.json({ ok: true });
}
