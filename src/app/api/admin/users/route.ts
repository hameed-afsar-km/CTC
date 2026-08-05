import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getUsers,
  setUserRoles,
  createUser,
  deleteUser,
  updateUser,
  getUser,
} from "@/lib/users-store";

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

export async function PUT(request: Request) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      roles?: string[];
      sources?: string[];
    };
    if (!body.email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const currentEmail = body.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }
    const nextEmail = currentEmail;
    if (nextEmail !== currentEmail) {
      const clash = await getUser(nextEmail);
      if (clash && clash.email.toLowerCase() !== currentEmail) {
        return NextResponse.json(
          { error: "a user with that email already exists" },
          { status: 409 }
        );
      }
    }
    const roles = Array.isArray(body.roles)
      ? Array.from(new Set(body.roles.map((r) => String(r).trim()).filter(Boolean)))
      : undefined;
    const sources = Array.isArray(body.sources)
      ? Array.from(new Set(body.sources.map((s) => String(s).trim()).filter(Boolean)))
      : undefined;
    const updated = await updateUser(currentEmail, {
      email: body.email,
      name: body.name,
      roles,
      sources,
    });
    if (!updated) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    return NextResponse.json({ user: updated });
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
  const email = searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const ok = await deleteUser(email);
  if (!ok) {
    return NextResponse.json({ error: "failed to delete user" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
