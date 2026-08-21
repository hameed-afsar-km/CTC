import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import {
  getUser,
  nextMemberCodeVersion,
  saveMemberCode,
} from "@/lib/users-store";
import { buildMemberCode, hashMemberCode } from "@/lib/member-codes";
import { bearerToken } from "@/lib/auth";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

// GET /api/admin/users/qr?email=<email>
// Admin views a member's current QR payload. The raw code is reconstructed
// server-side; only the hash lives in Firestore.
export async function GET(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = await getUser(email);
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  if (!user.memberCodeHash || !user.memberCodeVersion) {
    return NextResponse.json(
      { error: "member has no code issued yet" },
      { status: 404 }
    );
  }

  const code = buildMemberCode(user.email, user.memberCodeVersion);
  return NextResponse.json({
    code,
    name: user.name,
    roles: user.roles ?? [],
    version: user.memberCodeVersion,
    issuedAt: user.memberCodeIssuedAt ?? null,
  });
}

// POST /api/admin/users/qr  body: { email }
// Regenerate a member's code. Bumping the version revokes every previously
// issued code, so a shared / leaked QR stops working immediately.
export async function POST(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  let email: string;
  try {
    const body = (await request.json()) as { email?: string };
    email = (body.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = await getUser(email);
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const version = nextMemberCodeVersion(user);
  const code = buildMemberCode(email, version);
  await saveMemberCode(email, hashMemberCode(code), version, bearerToken(request));

  await logAction(
    request,
    access.session,
    "users",
    "regenerate member QR",
    `Regenerated membership QR for ${email} (v${version})`
  );

  return NextResponse.json({
    code,
    name: user.name,
    roles: user.roles ?? [],
    version,
    issuedAt: new Date().toISOString(),
  });
}
