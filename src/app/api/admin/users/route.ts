import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getUsers, setUserRoles, createUser } from "@/lib/users-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { name?: string; email?: string; roles?: string[] };
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }
    const roles = Array.isArray(body.roles)
      ? Array.from(new Set(body.roles.map((r) => String(r).trim()).filter(Boolean)))
      : [];
    const user = await createUser({ name: body.name, email: body.email, roles });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { email?: string; roles?: string[] };
    if (!body.email || !Array.isArray(body.roles)) {
      return NextResponse.json({ error: "email and roles are required" }, { status: 400 });
    }
    const roles = Array.from(new Set(body.roles.map((r) => String(r).trim()).filter(Boolean)));
    const updated = await setUserRoles(body.email.toLowerCase(), roles);
    if (!updated) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
