import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getApplications,
  updateApplicationStatus,
  updateApplication,
  deleteApplication,
} from "@/lib/applications-store";
import { isValidUrl, type Application } from "@/lib/applications";

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
    const body = (await request.json()) as { id?: string; status?: string; reason?: string };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await updateApplicationStatus(body.id, body.status, body.reason);
    if (!updated) {
      return NextResponse.json({ error: "application not found" }, { status: 404 });
    }
    return NextResponse.json({ application: updated });
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
    const updated = await updateApplication(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: "application not found" }, { status: 404 });
    }
    return NextResponse.json({ application: updated });
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
  const ok = await deleteApplication(id);
  if (!ok) {
    return NextResponse.json({ error: "failed to delete application" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
