import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import {
  getUsers,
  setUserRoles,
  createUser,
  deleteUser,
  updateUser,
  getUser,
  setUserPermissions,
} from "@/lib/users-store";
import { ADMIN_ROLES, isAdminRole, ALL_SCOPES } from "@/lib/roles";
import type { AdminScope, ScopePermissions } from "@/lib/roles";
import { bearerToken } from "@/lib/auth";
import { logAction } from "@/lib/logs-store";
import { getApplications, profileFromApplication } from "@/lib/applications-store";

export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);

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
  const access = await resolveAccess(request, "users");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  const users = await getUsers();
  // Only approved members (users who have at least one assigned role) are visible in Users & Roles
  const approvedMembers = users.filter(
    (u) => Array.isArray(u.roles) && u.roles.length > 0
  );

  // Enrich members whose record has no stored profile yet with the academic
  // details from their most recent application, so classification filters
  // (year / branch / degree / …) work for existing members too.
  const needsProfiles = approvedMembers.some(
    (u) => !u.profile || Object.keys(u.profile).length === 0
  );
  const latestApps = needsProfiles ? await getApplications() : [];
  const enriched = approvedMembers.map((u) => {
    if (u.profile && Object.keys(u.profile).length > 0) return u;
    const latest = latestApps.find(
      (a) => (a.collegeMail || "").toLowerCase() === u.email.toLowerCase()
    );
    if (!latest) return u;
    const profile = profileFromApplication(latest);
    if (!profile.degree && !profile.branch && !profile.year && !profile.contactNumber) {
      return u;
    }
    return { ...u, profile };
  });

  return NextResponse.json({ users: enriched });
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
    const user = await createUser({ name: body.name, email: body.email, roles }, bearerToken(request));
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
  } catch (err) {
    return errorResponse("admin/users POST", err);
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
      permissions?: ScopePermissions;
    };
    if (!body.email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const email = body.email.toLowerCase();

    if (body.permissions !== undefined) {
      if (!body.permissions || typeof body.permissions !== "object" || Array.isArray(body.permissions)) {
        return NextResponse.json({ error: "invalid permissions" }, { status: 400 });
      }
      const cleaned: ScopePermissions = {};
      for (const [scope, value] of Object.entries(body.permissions)) {
        if (!(ALL_SCOPES as string[]).includes(scope)) continue;
        if (value === true || value === false) {
          cleaned[scope as AdminScope] = value;
        }
      }
      const updated = await setUserPermissions(email, cleaned, bearerToken(request));
      if (!updated) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
      }
      await logAction(
        request,
        access.session,
        "users",
        "update permissions",
        `Updated dashboard permissions for ${email}: ${
          Object.keys(cleaned).length
            ? Object.entries(cleaned)
                .map(([scope, allow]) => `${scope}=${allow ? "allow" : "deny"}`)
                .join(", ")
            : "(all defaults)"
        }`
      );
      return NextResponse.json({ user: updated });
    }

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
      const updated = await setUserRoles(email, roles, bearerToken(request));
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
    const updated = await setUserRoles(email, roles, bearerToken(request));
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
  } catch (err) {
    return errorResponse("admin/users PATCH", err);
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
      permissions?: ScopePermissions;
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
    const permissions: ScopePermissions | undefined =
      body.permissions && typeof body.permissions === "object" && !Array.isArray(body.permissions)
        ? Object.fromEntries(
            Object.entries(body.permissions).filter(
              ([scope, value]) =>
                (ALL_SCOPES as string[]).includes(scope) &&
                (value === true || value === false)
            )
          )
        : undefined;
    const updated = await updateUser(
      currentEmail,
      {
        email: body.email,
        name: body.name,
        roles,
        sources,
        permissions,
      },
      bearerToken(request)
    );
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
  } catch (err) {
    return errorResponse("admin/users PUT", err);
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
  const ok = await deleteUser(email, bearerToken(request));
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
