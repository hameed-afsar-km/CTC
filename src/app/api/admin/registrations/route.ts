import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import {
  getRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  deleteRegistration,
} from "@/lib/registrations-store";
import type { EventRegistration } from "@/lib/registrations";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveAccess(request, "registrations");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId") || undefined;
    const registrations = await getRegistrations(eventId);
    return NextResponse.json({ registrations });
  } catch (err) {
    console.error("GET /api/admin/registrations error:", err);
    return NextResponse.json({ registrations: [] });
  }
}

export async function PATCH(request: Request) {
  const access = await resolveAccess(request, "registrations");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  try {
    const token = bearerToken(request);
    const body = (await request.json()) as {
      id?: string;
      status?: EventRegistration["status"];
      attended?: boolean;
      notes?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await getRegistrationById(body.id);
    if (!existing) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const patch: Partial<EventRegistration> = {};

    if (body.status) {
      if (!["confirmed", "attended", "cancelled"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = body.status;
      if (body.status === "attended") {
        patch.attended = true;
        patch.attendedAt = new Date().toISOString();
      }
    }

    if (typeof body.attended === "boolean") {
      patch.attended = body.attended;
      patch.attendedAt = body.attended ? new Date().toISOString() : null;
      if (body.attended) {
        patch.status = "attended";
      } else if (existing.status === "attended") {
        patch.status = "confirmed";
      }
    }

    const updated = await updateRegistrationStatus(existing.id, patch, token);

    await logAction(
      request,
      access.session,
      "registrations",
      "update registration",
      `Updated registration for ${existing.fullName} (${existing.collegeMail}) - Status: ${patch.status ?? existing.status}, Attended: ${patch.attended ?? existing.attended}`
    );

    return NextResponse.json({ registration: updated });
  } catch (err) {
    console.error("PATCH /api/admin/registrations error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update registration";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "registrations");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  try {
    const token = bearerToken(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await getRegistrationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    await deleteRegistration(existing.id, token);

    await logAction(
      request,
      access.session,
      "registrations",
      "delete registration",
      `Deleted registration of ${existing.fullName} (${existing.collegeMail}) for event ${existing.eventId}`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/registrations error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete registration";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
