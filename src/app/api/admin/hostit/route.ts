import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getHostitSubmissions, updateHostitStatus } from "@/lib/hostit-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const submissions = await getHostitSubmissions();
  return NextResponse.json({ submissions });
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
    const updated = await updateHostitStatus(body.id, body.status as "pending" | "approved" | "rejected");
    if (!updated) {
      return NextResponse.json({ error: "submission not found" }, { status: 404 });
    }
    return NextResponse.json({ submission: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
