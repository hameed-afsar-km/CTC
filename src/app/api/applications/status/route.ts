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

  return NextResponse.json({
    hasApplied,
    mode,
    roles: user?.roles ?? [],
    hasPending,
    branch: app?.branch ?? "",
  });
}
