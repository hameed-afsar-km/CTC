import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getApplications, updateApplicationStatus } from "@/lib/applications-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const applications = await getApplications();
  return NextResponse.json({ applications });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateApplicationStatus(body.id, body.status);
    if (!updated) {
      return NextResponse.json({ error: "application not found" }, { status: 404 });
    }
    return NextResponse.json({ application: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
