import { NextResponse } from "next/server";
import { verifyAdminToken, decodeTokenPayload } from "@/lib/auth";
import { addLog, requestMeta } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const token = String(body.idToken ?? "");
    if (!token) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
    const meta = requestMeta(request);
    const session = await verifyAdminToken(token);
    if (!session) {
      const decoded = decodeTokenPayload(token);
      await addLog({
        email: decoded?.email ?? "unknown",
        name: decoded?.name ?? decoded?.email ?? "unknown",
        role: "none",
        scope: "auth",
        action: "login denied",
        details: "Sign-in attempt was rejected",
        ...meta,
      });
      return NextResponse.json({ error: "not authorized" }, { status: 403 });
    }
    await addLog({
      email: session.email,
      name: session.name,
      role: session.role,
      scope: "auth",
      action: "login",
      details: "Signed in to the admin dashboard",
      ...meta,
    });
    return NextResponse.json({ session });
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "invalid payload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
