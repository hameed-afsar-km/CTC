import { NextResponse } from "next/server";
import { findApplicationByEmail } from "@/lib/applications-store";
import { bearerToken } from "@/lib/auth";
import { verifyCollegeIdToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  // Only the signed-in college account may check its own status — never
  // reveal whether any arbitrary address has already applied.
  const identity = await verifyCollegeIdToken(bearerToken(request) ?? "");
  if (!identity || identity.email !== email) {
    return NextResponse.json({ hasApplied: false });
  }

  const existing = await findApplicationByEmail(email);

  return NextResponse.json({
    hasApplied: !!existing,
  });
}
