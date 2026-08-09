import { NextResponse } from "next/server";
import { getUser } from "@/lib/users-store";
import {
  hashMemberCode,
  parseMemberCode,
  verifyMemberCode,
} from "@/lib/member-codes";

export const dynamic = "force-dynamic";

// Lightweight in-memory rate limiter: max 20 verify attempts per code per
// minute. Good enough for scanning a QR at the gate; Firestore-backed limiting
// can be added later if this ever becomes a target.
const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function allowed(code: string): boolean {
  const key = hashMemberCode(code);
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

// GET /api/member/verify?code=<code>
// Public endpoint — validating a membership QR. Returns member info when the
// code is genuine and currently valid.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").trim();

  if (!code) {
    return NextResponse.json(
      { valid: false, error: "missing code" },
      { status: 400 }
    );
  }
  if (!allowed(code)) {
    return NextResponse.json(
      { valid: false, error: "rate limited, try again shortly" },
      { status: 429 }
    );
  }

  const parsed = parseMemberCode(code);
  if (!parsed) {
    return NextResponse.json({ valid: false });
  }

  const user = await getUser(parsed.email);
  if (!user || !user.memberCodeHash || !user.memberCodeVersion) {
    return NextResponse.json({ valid: false });
  }

  // HMAC must match for the member's CURRENT code version. A regenerated
  // code (version bumped) makes every older code fail here.
  const verifiedEmail = verifyMemberCode(code, user.memberCodeVersion);
  if (!verifiedEmail || verifiedEmail !== parsed.email) {
    return NextResponse.json({ valid: false });
  }

  // Defense in depth: the presented code must hash to what we stored.
  if (user.memberCodeHash !== hashMemberCode(code)) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    name: user.name,
    roles: user.roles ?? [],
    memberSince: user.createdAt ?? null,
    version: user.memberCodeVersion,
  });
}
