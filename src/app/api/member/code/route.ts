import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { verifyCollegeIdToken } from "@/lib/firebase-admin";
import { getUser } from "@/lib/users-store";
import { buildMemberCode } from "@/lib/member-codes";

export const dynamic = "force-dynamic";

// GET /api/member/code
// Authenticated college member fetches their own QR code payload. The raw
// code is never stored — it is reconstructed server-side from the member's
// email and the shared secret.
export async function GET(request: Request) {
  const identity = await verifyCollegeIdToken(bearerToken(request) ?? "");
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getUser(identity.email);
  if (!user || !user.memberCodeHash || !user.memberCodeVersion) {
    return NextResponse.json(
      {
        error:
          "You do not have a member card yet. Your code is issued once your application is approved.",
      },
      { status: 404 }
    );
  }

  const code = buildMemberCode(user.email, user.memberCodeVersion);
  return NextResponse.json({
    code,
    name: user.name,
    roles: user.roles ?? [],
    issuedAt: user.memberCodeIssuedAt ?? null,
  });
}
