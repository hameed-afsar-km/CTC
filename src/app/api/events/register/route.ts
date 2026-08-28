import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { verifyCollegeIdToken } from "@/lib/firebase-admin";
import {
  findRegistration,
  saveRegistration,
  registrationDocId,
} from "@/lib/registrations-store";
import {
  generateTicketCode,
  extractRegisterNumber,
  type EventRegistration,
} from "@/lib/registrations";
import { findApplicationByEmail } from "@/lib/applications-store";
import { getUser } from "@/lib/users-store";
import { cleanStudentName, isValidUrl } from "@/lib/applications";

export const dynamic = "force-dynamic";

const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;
const PHONE_RE = /^[+]?[\d\s()-]{10,15}$/;

import { getEventBySlugOrId } from "@/lib/events-store";

export async function GET(request: Request) {
  try {
    const token = bearerToken(request);
    const identity = await verifyCollegeIdToken(token ?? "");
    if (!identity) {
      return NextResponse.json(
        { error: "Please sign in with your official @crescent.education account." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventQuery = (searchParams.get("eventId") || searchParams.get("slug") || "").trim();
    if (!eventQuery) {
      return NextResponse.json({ error: "eventId or slug is required" }, { status: 400 });
    }

    const event = await getEventBySlugOrId(eventQuery);
    const eventId = event?.id || eventQuery;
    const email = identity.email.toLowerCase();

    // Check if user is already registered for this event
    const existing = await findRegistration(eventId, email);
    if (existing) {
      return NextResponse.json({
        registered: true,
        registration: existing,
        event,
      });
    }

    // Not registered yet — look up historical data (from previous join applications or user profile)
    // to provide smooth auto-fill for the student
    let priorApp = null;
    try {
      priorApp = await findApplicationByEmail(email);
    } catch {
      priorApp = null;
    }

    let user = null;
    try {
      user = await getUser(email);
    } catch {
      user = null;
    }

    const storedProfile = user?.profile;
    const prefill = {
      fullName: cleanStudentName(priorApp?.fullName || user?.name || identity.name),
      collegeMail: email,
      registerNumber: extractRegisterNumber(email),
      contactNumber: priorApp?.contactNumber || storedProfile?.contactNumber || "",
      degree: priorApp?.degree || storedProfile?.degree || "",
      branch: priorApp?.branch || storedProfile?.branch || "",
      section: priorApp?.section || storedProfile?.section || "",
      year: priorApp?.year || storedProfile?.year || "",
      githubUrl: priorApp?.githubUrl || "",
      linkedinUrl: priorApp?.linkedinUrl || "",
    };

    return NextResponse.json({
      registered: false,
      prefill,
      event,
    });
  } catch (err) {
    console.error("GET /api/events/register error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check registration" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    const identity = await verifyCollegeIdToken(token ?? "");
    if (!identity) {
      return NextResponse.json(
        { error: "Please sign in with your official @crescent.education account." },
        { status: 401 }
      );
    }

    const email = identity.email.toLowerCase();
    if (!COLLEGE_EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Only official college accounts ending in @crescent.education are eligible." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<EventRegistration> & {
      customResponses?: Record<string, string | boolean | number>;
    };

    const rawEventId = String(body.eventId ?? "").trim();
    if (!rawEventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const event = await getEventBySlugOrId(rawEventId);
    const eventId = event?.id || rawEventId;
    const eventTitle = event?.title || String(body.eventTitle ?? "").trim() || "Workshop Event";

    // STRICT ONCE-PER-USER REGISTRATION CHECK
    const existing = await findRegistration(eventId, email);
    if (existing) {
      return NextResponse.json(
        {
          error: "You are already registered for this event. Multiple registrations are not allowed.",
          registration: existing,
        },
        { status: 409 }
      );
    }

    // Validate standard name
    const rawName = String(body.fullName ?? "").trim() || identity.name;
    const fullName = cleanStudentName(rawName);
    if (!fullName) {
      return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    // Validate register number / RRN
    const registerNumber = String(body.registerNumber ?? "").trim() || extractRegisterNumber(email);
    if (!registerNumber) {
      return NextResponse.json(
        { error: "College Register / Roll Number is required" },
        { status: 400 }
      );
    }

    // Validate contact number
    const contactNumber = String(body.contactNumber ?? "").trim();
    if (!contactNumber || !PHONE_RE.test(contactNumber)) {
      return NextResponse.json(
        { error: "A valid 10 to 15 digit contact/WhatsApp number is required" },
        { status: 400 }
      );
    }

    // Validate academic fields
    const degree = String(body.degree ?? "").trim();
    const branch = String(body.branch ?? "").trim();
    const year = String(body.year ?? "").trim();
    const section = String(body.section ?? "").trim();

    if (!degree || !branch || !year) {
      return NextResponse.json(
        { error: "Degree, branch/department, and year of study are required" },
        { status: 400 }
      );
    }

    // Validate dynamic custom responses if configured on the event
    const customResponses = { ...(body.customResponses || {}) };
    if (event && Array.isArray(event.customFields)) {
      for (const field of event.customFields) {
        const val = customResponses[field.id] ?? (body as Record<string, unknown>)[field.id];
        if (field.required && (val === undefined || val === null || String(val).trim() === "")) {
          return NextResponse.json(
            { error: `"${field.label}" is required` },
            { status: 400 }
          );
        }
        if (val !== undefined) {
          customResponses[field.id] = val as string | boolean | number;
        }
      }
    }

    // Validate URLs if present
    if (body.githubUrl && !isValidUrl(body.githubUrl)) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }
    if (body.linkedinUrl && !isValidUrl(body.linkedinUrl)) {
      return NextResponse.json({ error: "Invalid LinkedIn URL" }, { status: 400 });
    }

    if (body.consented !== true) {
      return NextResponse.json(
        { error: "You must agree to the club event guidelines and code of conduct to register" },
        { status: 400 }
      );
    }

    const docId = registrationDocId(eventId, email);
    const ticketCode = generateTicketCode(eventId);

    const registration: EventRegistration = {
      id: docId,
      ticketCode,
      eventId,
      eventTitle,
      collegeMail: email,
      fullName,
      registerNumber,
      contactNumber,
      degree,
      branch,
      section: section || "N/A",
      year,
      skillLevel: body.skillLevel || (customResponses["skillLevel"] as string) || "All Levels",
      laptop: body.laptop || (customResponses["laptop"] ? (String(customResponses["laptop"]).toLowerCase().includes("yes") ? "yes" : "no") : undefined),
      githubUrl: (body.githubUrl || (customResponses["githubUrl"] as string) || "").trim(),
      linkedinUrl: (body.linkedinUrl || (customResponses["linkedinUrl"] as string) || "").trim(),
      expectations: (body.expectations || (customResponses["expectations"] as string) || "").trim(),
      customResponses,
      consented: true,
      status: "confirmed",
      attended: false,
      attendedAt: null,
      registeredAt: new Date().toISOString(),
      authUid: identity.uid,
    };

    await saveRegistration(registration, token);

    return NextResponse.json({ success: true, registration }, { status: 201 });
  } catch (err) {
    console.error("POST /api/events/register error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to register for workshop" },
      { status: 500 }
    );
  }
}
