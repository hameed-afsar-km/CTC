import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getHostitSubmissions,
  updateHostitStatus,
  updateHostitSubmission,
  deleteHostitSubmission,
} from "@/lib/hostit-store";
import type { HostitSubmission, SubmissionStatus } from "@/lib/hostit-store";

export const dynamic = "force-dynamic";

const VALID_STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected"];

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
    const body = (await request.json()) as { id?: string; status?: string; reason?: string };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(body.status as SubmissionStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateHostitStatus(body.id, body.status as SubmissionStatus, body.reason);
    if (!updated) {
      return NextResponse.json({ error: "submission not found" }, { status: 404 });
    }
    return NextResponse.json({ submission: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { id?: string } & Partial<HostitSubmission>;
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (body.status && !VALID_STATUSES.includes(body.status as SubmissionStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateHostitSubmission(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: "submission not found" }, { status: 404 });
    }
    return NextResponse.json({ submission: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const ok = await deleteHostitSubmission(id);
  if (!ok) {
    return NextResponse.json({ error: "failed to delete submission" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
