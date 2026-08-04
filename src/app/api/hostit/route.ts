import { NextResponse } from "next/server";
import { saveHostitSubmission, type HostitSubmission } from "@/lib/hostit-store";
import { upsertUser } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<HostitSubmission>;

    const required = [
      "organizerName",
      "email",
      "contactNumber",
      "degree",
      "department",
      "section",
      "year",
      "description",
    ] as const;
    for (const key of required) {
      if (!String(body[key] ?? "").trim()) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }
    if (!/^[^\s@]+@crescent\.education$/i.test(String(body.email).trim())) {
      return NextResponse.json(
        { error: "email must be an official @crescent.education address" },
        { status: 400 }
      );
    }

    const submission: HostitSubmission = {
      id: `host-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: String(body.eventType ?? "").trim(),
      organizerName: String(body.organizerName).trim(),
      email: String(body.email).trim().toLowerCase(),
      contactNumber: String(body.contactNumber).trim(),
      degree: String(body.degree).trim(),
      department: String(body.department).trim(),
      section: String(body.section).trim(),
      year: String(body.year).trim(),
      expectedAttendees: String(body.expectedAttendees ?? "").trim(),
      description: String(body.description).trim(),
      proposedDate: String(body.proposedDate ?? "").trim(),
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    await saveHostitSubmission(submission);
    await upsertUser({
      email: submission.email,
      name: submission.organizerName,
      source: "hostit",
    });
    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
