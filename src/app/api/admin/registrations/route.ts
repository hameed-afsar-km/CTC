import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import {
  getRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  saveRegistration,
  registrationDocId,
  deleteRegistration,
} from "@/lib/registrations-store";
import { generateTicketCode, type EventRegistration } from "@/lib/registrations";
import { getEventBySlugOrId } from "@/lib/events-store";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

const PHONE_RE = /^[+]?[\d\s()-]{10,15}$/;

function cleanEmail(v?: string): string {
  return (v ?? "").trim().toLowerCase();
}

async function applyBasicFields(
  body: Record<string, unknown>
): Promise<{ err?: string; fields?: {
  eventId: string;
  eventTitle: string;
  collegeMail: string;
  fullName: string;
  registerNumber: string;
  contactNumber: string;
  degree: string;
  branch: string;
  section: string;
  year: string;
  status: EventRegistration["status"];
  consented: boolean;
  skillLevel?: string;
  laptop?: "yes" | "no";
  githubUrl?: string;
  linkedinUrl?: string;
  expectations?: string;
  customResponses?: Record<string, string | boolean | number>;
}}> {
  const eventId = String(body.eventId ?? "").trim();
  const collegeMail = cleanEmail(body.collegeMail as string);
  const fullName = String(body.fullName ?? "").trim();
  const registerNumber = String(body.registerNumber ?? "").trim();
  const contactNumber = String(body.contactNumber ?? "").trim();
  const degree = String(body.degree ?? "").trim();
  const branch = String(body.branch ?? "").trim();
  const section = String(body.section ?? "").trim();
  const year = String(body.year ?? "").trim();

  if (!eventId) return { err: "eventId is required", fields: undefined };
  if (!collegeMail) return { err: "College email is required", fields: undefined };
  if (!/^[^\s@]+@crescent\.education$/i.test(collegeMail)) {
    return { err: "College email must end in @crescent.education", fields: undefined };
  }
  if (!fullName) return { err: "Full name is required", fields: undefined };
  if (!registerNumber) return { err: "Register number is required", fields: undefined };
  if (!contactNumber || !PHONE_RE.test(contactNumber)) {
    return { err: "A valid 10 to 15 digit contact number is required", fields: undefined };
  }
  if (!degree || !branch || !year) {
    return { err: "Degree, branch and year are required", fields: undefined };
  }

  const status = (body.status as EventRegistration["status"]) || "confirmed";
  if (!["confirmed", "attended", "cancelled"].includes(status)) {
    return { err: "Invalid status", fields: undefined };
  }

  const event = await getEventBySlugOrId(eventId);
  const eventTitle = event?.title || String(body.eventTitle ?? "").trim() || "Event";
  const customResponses = (body.customResponses as Record<string, string | boolean | number>) || {};

  return {
    fields: {
      eventId: event?.id || eventId,
      eventTitle,
      collegeMail,
      fullName,
      registerNumber,
      contactNumber,
      degree,
      branch,
      section: section || "N/A",
      year,
      status,
      consented: true,
      skillLevel: (body.skillLevel as string) || (customResponses.skillLevel as string) || undefined,
      laptop: (body.laptop as "yes" | "no") ||
        (customResponses.laptop ? (String(customResponses.laptop).toLowerCase().includes("yes") ? "yes" : "no") : undefined),
      githubUrl: (body.githubUrl as string) || (customResponses.githubUrl as string) || undefined,
      linkedinUrl: (body.linkedinUrl as string) || (customResponses.linkedinUrl as string) || undefined,
      expectations: (body.expectations as string) || (customResponses.expectations as string) || undefined,
      customResponses,
    },
  };
}

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

export async function POST(request: Request) {
  const access = await resolveAccess(request, "registrations");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  try {
    const token = bearerToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    const { err, fields } = await applyBasicFields(body);
    if (err || !fields) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const docId = registrationDocId(fields.eventId, fields.collegeMail);
    const existing = await getRegistrationById(docId);

    const registration: EventRegistration = {
      id: docId,
      ticketCode: existing?.ticketCode || generateTicketCode(fields.eventId),
      eventId: fields.eventId,
      eventTitle: fields.eventTitle,
      collegeMail: fields.collegeMail,
      fullName: fields.fullName,
      registerNumber: fields.registerNumber,
      contactNumber: fields.contactNumber,
      degree: fields.degree,
      branch: fields.branch,
      section: fields.section,
      year: fields.year,
      skillLevel: fields.skillLevel,
      laptop: fields.laptop,
      githubUrl: fields.githubUrl,
      linkedinUrl: fields.linkedinUrl,
      expectations: fields.expectations,
      customResponses: fields.customResponses,
      consented: true,
      status: fields.status,
      attended: fields.status === "attended",
      attendedAt: fields.status === "attended" ? new Date().toISOString() : null,
      registeredAt: existing?.registeredAt || new Date().toISOString(),
    };

    await saveRegistration(registration, token);

    await logAction(
      request,
      access.session,
      "registrations",
      existing ? "update registration details" : "create registration",
      `${existing ? "Updated" : "Created"} registration for ${fields.fullName} (${fields.collegeMail}) for event ${fields.eventTitle}`
    );

    return NextResponse.json({ registration }, { status: existing ? 200 : 201 });
  } catch (err) {
    console.error("POST /api/admin/registrations error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create registration";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "registrations");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  try {
    const token = bearerToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await getRegistrationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const { err, fields } = await applyBasicFields(body);
    if (err || !fields) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const docId = registrationDocId(fields.eventId, fields.collegeMail);
    const registration: EventRegistration = {
      ...existing,
      id: docId,
      eventId: fields.eventId,
      eventTitle: fields.eventTitle,
      collegeMail: fields.collegeMail,
      fullName: fields.fullName,
      registerNumber: fields.registerNumber,
      contactNumber: fields.contactNumber,
      degree: fields.degree,
      branch: fields.branch,
      section: fields.section,
      year: fields.year,
      skillLevel: fields.skillLevel,
      laptop: fields.laptop,
      githubUrl: fields.githubUrl,
      linkedinUrl: fields.linkedinUrl,
      expectations: fields.expectations,
      customResponses: fields.customResponses,
      status: fields.status,
      attended: fields.status === "attended",
      attendedAt: fields.status === "attended" ? existing.attendedAt || new Date().toISOString() : null,
    };

    if (docId !== existing.id && (await getRegistrationById(docId))) {
      return NextResponse.json(
        { error: "A registration already exists for that event and email." },
        { status: 409 }
      );
    }

    await saveRegistration(registration, token);
    if (docId !== existing.id) {
      await deleteRegistration(existing.id, token);
    }

    await logAction(
      request,
      access.session,
      "registrations",
      "update registration details",
      `Updated registration details for ${fields.fullName} (${fields.collegeMail}) for event ${fields.eventTitle}`
    );

    return NextResponse.json({ registration });
  } catch (err) {
    console.error("PUT /api/admin/registrations error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update registration";
    return NextResponse.json({ error: msg }, { status: 500 });
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
