import { NextResponse } from "next/server";
import {
  findApplicationByEmail,
  getApplications,
  saveApplication,
} from "@/lib/applications-store";
import type { Application } from "@/lib/applications";
import { getJoinRolesConfig } from "@/lib/join-roles-store";

export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = ["fullName", "role", "collegeMail", "contactNumber", "degree", "branch", "section", "year", "reason"] as const;

// A person may only apply once per 24-hour window.
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_LIMIT_MESSAGE =
  "You've already applied today. Please contact the team directly for any follow-ups or updates.";

export async function GET() {
  const applications = await getApplications();
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Application>;

    for (const key of REQUIRED_FIELDS) {
      if (!body[key]) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }
    if (!/^[^\s@]+@crescent\.education$/i.test(String(body.collegeMail).trim())) {
      return NextResponse.json(
        { error: "collegeMail must be an official @crescent.education address" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.interests) || body.interests.length === 0) {
      return NextResponse.json({ error: "interests are required" }, { status: 400 });
    }
    if (!Array.isArray(body.skills) || body.skills.length === 0) {
      return NextResponse.json({ error: "skills are required" }, { status: 400 });
    }
    if (!body.consented) {
      return NextResponse.json({ error: "contact consent is required" }, { status: 400 });
    }

    const collegeMail = String(body.collegeMail).trim().toLowerCase();

    const config = await getJoinRolesConfig();
    const role = String(body.role ?? "").trim() || "member";
    const openRoles = config.roles.length > 0 ? config.roles : ["member"];
    if (!openRoles.includes(role)) {
      return NextResponse.json(
        { error: "The selected role is no longer open for applications" },
        { status: 400 }
      );
    }

    const existing = await findApplicationByEmail(collegeMail);
    if (existing) {
      const submittedAt = new Date(existing.submittedAt || 0).getTime();
      if (
        Number.isFinite(submittedAt) &&
        Date.now() - submittedAt < WINDOW_MS
      ) {
        return NextResponse.json({ error: DAILY_LIMIT_MESSAGE }, { status: 429 });
      }
    }

    const application: Application = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: String(body.fullName).trim(),
      collegeMail,
      contactNumber: String(body.contactNumber).trim(),
      role,
      degree: String(body.degree).trim(),
      branch: String(body.branch).trim(),
      section: String(body.section).trim(),
      year: String(body.year).trim(),
      interests: body.interests.map(String),
      skills: body.skills.map(String),
      reason: String(body.reason).trim(),
      linkedinUrl: String(body.linkedinUrl ?? "").trim(),
      githubUrl: String(body.githubUrl ?? "").trim(),
      socialMediaUrl: String(body.socialMediaUrl ?? "").trim(),
      portfolioUrl: String(body.portfolioUrl ?? "").trim(),
      consented: Boolean(body.consented),
      submittedAt: new Date().toISOString(),
    };

    await saveApplication(application);
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "failed to save application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
