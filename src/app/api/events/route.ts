import { NextResponse } from "next/server";
import { getEvents } from "@/lib/events-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (err) {
    console.error("GET /api/events error:", err);
    return NextResponse.json({ events: [] });
  }
}
