import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import { getJoinRolesConfig, saveJoinRolesConfig } from "@/lib/join-roles-store";
import {
  JOIN_ROLES_DOC_ID,
  ALL_JOIN_ROLES,
  normalizeCustomRole,
  sanitizeDeletedRoles,
  sanitizeRoleDetails,
  sanitizeRoleLabels,
  sanitizeRoleLinks,
  type JoinRolesConfig,
} from "@/lib/join-roles";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveAccess(request, "join");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const config = await getJoinRolesConfig();
    return NextResponse.json({ config });
  } catch (err) {
    console.error("GET /api/admin/join-roles error:", err);
    return NextResponse.json({ config: null });
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "join");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const token = bearerToken(request);
    const body = (await request.json()) as Partial<JoinRolesConfig>;
    if (!Array.isArray(body.roles)) {
      return NextResponse.json({ error: "roles array is required" }, { status: 400 });
    }
    if (!Array.isArray(body.customRoles)) {
      return NextResponse.json({ error: "customRoles array is required" }, { status: 400 });
    }
    const customRoles = Array.from(
      new Set(body.customRoles.map(normalizeCustomRole).filter(Boolean))
    );
    const deletedRoles = sanitizeDeletedRoles(body.deletedRoles);
    const deletedSet = new Set(deletedRoles);
    const allowed = new Set([...ALL_JOIN_ROLES, ...customRoles]);
    const roles = Array.from(
      new Set(body.roles.filter((r) => allowed.has(r) && !deletedSet.has(normalizeCustomRole(r))))
    );
    const roleDetails = sanitizeRoleDetails(body.roleDetails);
    const roleLabels = sanitizeRoleLabels(body.roleLabels);
    const roleLinks = sanitizeRoleLinks(body.roleLinks);
    const config: JoinRolesConfig = {
      id: JOIN_ROLES_DOC_ID,
      roles,
      customRoles: customRoles.filter((r) => !deletedSet.has(normalizeCustomRole(r))),
      deletedRoles,
      roleDetails,
      roleLabels,
      roleLinks,
    };
    await saveJoinRolesConfig(config, token);
    await logAction(
      request,
      access.session,
      "join",
      roles.length === 0 ? "close all join roles" : "update open join roles",
      `Roles open for joining: ${roles.length === 0 ? "(none)" : roles.join(", ")}`
    );
    const updated = await getJoinRolesConfig();
    return NextResponse.json({ config: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save join roles";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
