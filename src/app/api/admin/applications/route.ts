import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import {
  getApplications,
  updateApplicationStatus,
  updateApplication,
  deleteApplication,
} from "@/lib/applications-store";
import { isValidUrl, type Application } from "@/lib/applications";
import { bearerToken } from "@/lib/auth";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

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
  const access = await resolveAccess(request, "applications");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const applications = await getApplications();
  return NextResponse.json({ applications });
}

export async function PATCH(request: Request) {
  const access = await resolveAccess(request, "applications");
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
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateApplicationStatus(
      body.id,
      body.status,
      body.reason,
      bearerToken(request)
    );
    if (!updated) {
      return NextResponse.json({ error: "application not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "applications",
      `application ${body.status}`,
      `${body.status === "approved" ? "Approved" : body.status === "rejected" ? "Rejected" : "Reset"} application ${body.id}${
        body.reason ? ` — reason: ${body.reason}` : ""
      }`
    );
    return NextResponse.json({ application: updated });
  } catch (err) {
    return errorResponse("admin/applications PATCH", err);
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "applications");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const body = (await request.json()) as Partial<Application>;
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (body.status && !["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    for (const key of ["linkedinUrl", "githubUrl", "socialMediaUrl", "portfolioUrl"] as const) {
      const value = body[key];
      if (typeof value === "string" && !isValidUrl(value)) {
        return NextResponse.json({ error: `${key} is not a valid URL` }, { status: 400 });
      }
    }
    const updated = await updateApplication(body.id, body, bearerToken(request));
    if (!updated) {
      return NextResponse.json({ error: "application not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "applications",
      "update application",
      `Updated application ${body.id}`
    );
    return NextResponse.json({ application: updated });
  } catch (err) {
    return errorResponse("admin/applications PUT", err);
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "applications");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  let id: string | null = null;
  let reason = "";
  try {
    const body = (await request.json().catch(() => null)) as { id?: string; reason?: string } | null;
    if (body && typeof body === "object") {
      id = typeof body.id === "string" ? body.id : null;
      reason = typeof body.reason === "string" ? body.reason.trim() : "";
    }
  } catch {
    // fallback
  }
  if (!id) {
    const { searchParams } = new URL(request.url);
    id = searchParams.get("id");
    if (!reason) reason = (searchParams.get("reason") || "").trim();
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "reason for deletion is required" }, { status: 400 });
  }

  const ok = await deleteApplication(id, bearerToken(request));
  if (!ok) {
    return NextResponse.json({ error: "failed to delete application" }, { status: 500 });
  }
  await logAction(
    request,
    access.session,
    "applications",
    "delete application",
    `Deleted application ${id} — reason: ${reason}`
  );
  return NextResponse.json({ ok: true });
}
