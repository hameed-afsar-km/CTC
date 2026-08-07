import { NextResponse } from "next/server";
import { hasActiveApplicationLimit, hasPendingApplication } from "@/lib/applications-store";
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
    });
  }

  const user = await getUser(email);
  const resetAt = user?.joinResetAt ?? null;
  const hasApplied = await hasActiveApplicationLimit(email, resetAt);
  const hasPending = await hasPendingApplication(email);

  // Existing member → they are eligible for the self-service "apply for a role"
  // path. New people → the regular join path.
  const mode = user ? "role" : "join";

  return NextResponse.json({
    hasApplied,
    mode,
    roles: user?.roles ?? [],
    hasPending,
  });
}
