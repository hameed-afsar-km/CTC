import { NextResponse } from "next/server";
import { getJoinRolesConfig } from "@/lib/join-roles-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getJoinRolesConfig();
    const deleted = new Set(config.deletedRoles ?? []);
    const roles = (config.roles ?? []).filter((r) => !deleted.has(r));
    return NextResponse.json({
      roles,
      roleDetails: config.roleDetails ?? {},
      roleLabels: config.roleLabels ?? {},
      roleLinks: config.roleLinks ?? {},
    });
  } catch (err) {
    console.error("GET /api/join-roles error:", err);
    return NextResponse.json({ roles: [], roleDetails: {}, roleLabels: {}, roleLinks: {} });
  }
}
