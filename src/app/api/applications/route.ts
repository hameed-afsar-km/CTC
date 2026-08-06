import { NextResponse } from "next/server";
import {
  getApplications,
  hasActiveApplicationLimit,
  saveApplication,
} from "@/lib/applications-store";
import type { Application } from "@/lib/applications";
import { getJoinRolesConfig } from "@/lib/join-roles-store";
import { bearerToken } from "@/lib/auth";
import { verifyCollegeIdToken } from "@/lib/firebase-admin";
import { clearJoinReset, getUser, upsertUser } from "@/lib/users-store";

export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = ["fullName", "role", "contactNumber", "degree", "branch", "section", "year", "reason"] as const;

const ALREADY_APPLIED_MESSAGE =
  "An application has already been submitted with this email. Please contact the team directly for any follow-ups or updates.";

export async function GET() {
  const applications = await getApplications();
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  try {
    // The applicant must be signed in with their official college Google
    // account. The verified email from the ID token is the only trusted one —
    // anything typed into the form is ignored so no one can spoof an address.
    const identity = await verifyCollegeIdToken(bearerToken(request) ?? "");
    if (!identity) {
      return NextResponse.json(
        { error: "Please sign in with your college Google account to apply." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Partial<Application>;

    for (const key of REQUIRED_FIELDS) {
      if (!body[key]) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
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

    const collegeMail = identity.email;

    const config = await getJoinRolesConfig();
    const role = String(body.role ?? "").trim() || "member";
    const openRoles = config.roles.length > 0 ? config.roles : ["member"];
    if (!openRoles.includes(role)) {
      return NextResponse.json(
        { error: "The selected role is no longer open for applications" },
        { status: 400 }
      );
    }

    // A person may only apply once with the same email address, regardless of
    // the outcome of the earlier request — unless an admin has revoked the
    // limit (joinResetAt), which allows exactly one more application.
    const user = await getUser(collegeMail);
    const resetAt = user?.joinResetAt ?? null;
    if (await hasActiveApplicationLimit(collegeMail, resetAt)) {
      return NextResponse.json({ error: ALREADY_APPLIED_MESSAGE }, { status: 400 });
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
      authUid: identity.uid,
      submittedAt: new Date().toISOString(),
    };

    await saveApplication(application);
    await upsertUser({ email: collegeMail, name: application.fullName, source: "join" });
    if (resetAt) {
      await clearJoinReset(collegeMail);
    }
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "failed to save application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
