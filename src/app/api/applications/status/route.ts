import { NextResponse } from "next/server";
import { hasActiveApplicationLimit, findApplicationByEmail } from "@/lib/applications-store";
import { bearerToken } from "@/lib/auth";
import { verifyCollegeIdToken } from "@/lib/firebase-admin";
import { getUser } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  // Only the signed-in college account may check its own status — never
  // reveal whether any arbitrary address has already applied.
  const identity = await verifyCollegeIdToken(bearerToken(request) ?? "");
  if (!identity || identity.email !== email) {
    return NextResponse.json({
      hasApplied: false,
      mode: "join",
      roles: [],
      hasPending: false,
      branch: "",
    });
  }

  const user = await getUser(email);
  const resetAt = user?.joinResetAt ?? null;
  const hasApplied = await hasActiveApplicationLimit(email, resetAt);
  const app = await findApplicationByEmail(email);
  const hasPending = Boolean(app && (app.status ?? "pending") === "pending");

  // Existing member with approved roles → eligible for self-service role application.
  // New or unassigned users → regular join path.
  const isMember = Boolean(user && Array.isArray(user.roles) && user.roles.length > 0);
  const mode = isMember ? "role" : "join";

  // Profile for form auto-fill: prefer the latest application's answers, and
  // fall back to the member's stored Firestore profile so admins-added members
  // (who may have no application history) still get their details filled in.
  const stored = user?.profile;
  const pick = (...values: unknown[]) => {
    for (const value of values) {
      const v = String(value ?? "").trim();
      if (v) return v;
    }
    return "";
  };
  const profile = app || stored
    ? {
        fullName: pick(app?.fullName, user?.name),
        contactNumber: pick(app?.contactNumber, stored?.contactNumber),
        degree: pick(app?.degree, stored?.degree),
        branch: pick(app?.branch, stored?.branch),
        section: pick(app?.section, stored?.section),
        year: pick(app?.year, stored?.year),
        interests: Array.isArray(app?.interests) ? app.interests : [],
        skills: Array.isArray(app?.skills) ? app.skills : [],
        linkedinUrl: app?.linkedinUrl ?? "",
        githubUrl: app?.githubUrl ?? "",
        socialMediaUrl: app?.socialMediaUrl ?? "",
        portfolioUrl: app?.portfolioUrl ?? "",
      }
    : null;

  return NextResponse.json({
    hasApplied,
    mode,
    roles: user?.roles ?? [],
    hasPending,
    branch: pick(app?.branch, stored?.branch),
    profile,
  });
}
