import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import { getLogs, clearLogs, logAction } from "@/lib/logs-store";

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

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "logs");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !ids.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "ids array is required" },
      { status: 400 }
    );
  }

  const deleted = await clearLogs(ids);
  await logAction(
    request,
    access.session,
    "logs",
    "clear logs",
    `Cleared ${deleted} filtered log entries`
  );
  return NextResponse.json({ ok: true, deleted });
}
