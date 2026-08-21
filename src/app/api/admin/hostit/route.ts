import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import {
  getHostitSubmissions,
  updateHostitStatus,
  updateHostitSubmission,
  deleteHostitSubmission,
} from "@/lib/hostit-store";
import type { HostitSubmission, SubmissionStatus } from "@/lib/hostit-store";
import { bearerToken } from "@/lib/auth";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

const VALID_STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected"];

// Distinguishes malformed JSON ("invalid payload") from server-side failures,
// which are logged and surfaced with their real message instead of a blanket
// 400 that hides the root cause.
function errorResponse(scope: string, err: unknown): NextResponse {
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  console.error(`[${scope}]`, err);
  const message =
    err instanceof Error && err.message ? err.message : "internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  const access = await resolveAccess(request, "hostit");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const submissions = await getHostitSubmissions();
  return NextResponse.json({ submissions });
}

export async function PATCH(request: Request) {
  const access = await resolveAccess(request, "hostit");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const body = (await request.json()) as { id?: string; status?: string; reason?: string };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(body.status as SubmissionStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateHostitStatus(
      body.id,
      body.status as SubmissionStatus,
      body.reason,
      bearerToken(request)
    );
    if (!updated) {
      return NextResponse.json({ error: "submission not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "hostit",
      `submission ${body.status}`,
      `${body.status === "approved" ? "Approved" : body.status === "rejected" ? "Rejected" : "Reset"} Host'It submission ${body.id}${
        body.reason ? ` — reason: ${body.reason}` : ""
      }`
    );
    return NextResponse.json({ submission: updated });
  } catch (err) {
    return errorResponse("admin/hostit PATCH", err);
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "hostit");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const body = (await request.json()) as { id?: string } & Partial<HostitSubmission>;
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (body.status && !VALID_STATUSES.includes(body.status as SubmissionStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateHostitSubmission(body.id, body, bearerToken(request));
    if (!updated) {
      return NextResponse.json({ error: "submission not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "hostit",
      "update submission",
      `Updated Host'It submission ${body.id}`
    );
    return NextResponse.json({ submission: updated });
  } catch (err) {
    return errorResponse("admin/hostit PUT", err);
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "hostit");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const ok = await deleteHostitSubmission(id, bearerToken(request));
  if (!ok) {
    return NextResponse.json({ error: "failed to delete submission" }, { status: 500 });
  }
  await logAction(
    request,
    access.session,
    "hostit",
    "delete submission",
    `Deleted Host'It submission ${id}`
  );
  return NextResponse.json({ ok: true });
}
