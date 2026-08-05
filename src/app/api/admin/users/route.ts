import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import {
  getUsers,
  setUserRoles,
  createUser,
  deleteUser,
  updateUser,
  getUser,
} from "@/lib/users-store";
import { ADMIN_ROLES, isAdminRole } from "@/lib/roles";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);

export async function GET(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
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
    await logAction(
      request,
      access.session,
      "users",
      "create user",
      `Created user "${user.name}" (${user.email})${
        roles.length ? ` — roles: ${roles.join(", ")}` : ""
      }`
    );
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const body = (await request.json()) as {
      email?: string;
      roles?: string[];
      adminRole?: string;
    };
    if (!body.email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const email = body.email.toLowerCase();

    if (body.adminRole !== undefined) {
      const existing = await getUser(email);
      if (!existing) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
      }
      const base = existing.roles ?? [];
      let roles: string[];
      if (body.adminRole === "none") {
        roles = base.filter((r) => !ADMIN_ROLE_SET.has(r));
      } else if (isAdminRole(body.adminRole)) {
        roles = [...base.filter((r) => !ADMIN_ROLE_SET.has(r)), body.adminRole];
      } else {
        return NextResponse.json(
          { error: `invalid role. Allowed: ${ADMIN_ROLES.join(", ")}, none` },
          { status: 400 }
        );
      }
      const updated = await setUserRoles(email, roles);
      if (!updated) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
      }
      await logAction(
        request,
        access.session,
        "users",
        "assign role",
        `Assigned role "${body.adminRole}" to ${email}${
          body.adminRole === "none" ? " (removed admin role)" : ""
        }`
      );
      return NextResponse.json({ user: updated });
    }

    if (!Array.isArray(body.roles)) {
      return NextResponse.json({ error: "roles or adminRole are required" }, { status: 400 });
    }
    const roles = Array.from(new Set(body.roles.map((r) => String(r).trim()).filter(Boolean)));
    const updated = await setUserRoles(email, roles);
    if (!updated) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    await logAction(
      request,
      access.session,
      "users",
      "update roles",
      `Set roles for ${email} to: ${roles.join(", ") || "(none)"}`
    );
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
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
    await logAction(
      request,
      access.session,
      "users",
      "update user",
      `Updated user "${updated.name}" (${updated.email})${
        roles ? ` — roles: ${roles.join(", ")}` : ""
      }`
    );
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (email.toLowerCase() === access.session.email.toLowerCase()) {
    return NextResponse.json(
      { error: "you cannot delete your own account" },
      { status: 400 }
    );
  }
  const ok = await deleteUser(email);
  if (!ok) {
    return NextResponse.json({ error: "failed to delete user" }, { status: 500 });
  }
  await logAction(
    request,
    access.session,
    "users",
    "delete user",
    `Deleted user ${email}`
  );
  return NextResponse.json({ ok: true });
}
