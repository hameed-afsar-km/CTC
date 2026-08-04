import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const token = String(body.idToken ?? "");
    if (!token) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
    const session = await verifyAdminToken(token);
    if (!session) {
      return NextResponse.json({ error: "not authorized" }, { status: 403 });
    }
    return NextResponse.json({ session });
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "invalid payload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
