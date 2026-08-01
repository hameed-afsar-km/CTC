import { NextResponse } from "next/server";
import { getEvents, saveEvents } from "@/lib/events-store";
import type { ClubEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getEvents();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ClubEvent>;
    if (!body.title || !body.date) {
      return NextResponse.json({ error: "title and date are required" }, { status: 400 });
    }
    const events = await getEvents();
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
    events.push(event);
    await saveEvents(events);
    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ClubEvent;
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const events = await getEvents();
    const idx = events.findIndex((e) => e.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ error: "event not found" }, { status: 404 });
    }
    events[idx] = { ...events[idx], ...body };
    await saveEvents(events);
    return NextResponse.json({ event: events[idx] });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const events = await getEvents();
  const next = events.filter((e) => e.id !== id);
  if (next.length === events.length) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }
  await saveEvents(next);
  return NextResponse.json({ ok: true });
}
