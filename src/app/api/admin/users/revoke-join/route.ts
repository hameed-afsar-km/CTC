import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import { revokeJoinLimit } from "@/lib/users-store";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const user = await revokeJoinLimit(body.email, bearerToken(request));
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "users",
      "revoke join limit",
      `Revoked join-application limit for ${user.email}`
    );
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[admin/users/revoke-join]", err);
    const message =
      err instanceof Error && err.message ? err.message : "internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
