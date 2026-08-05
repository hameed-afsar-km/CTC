import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import { getLogs } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveAccess(request, "logs");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const logs = await getLogs();
  return NextResponse.json({ logs });
}
