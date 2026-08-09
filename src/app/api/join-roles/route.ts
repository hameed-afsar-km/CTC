import { NextResponse } from "next/server";
import { getJoinRolesConfig } from "@/lib/join-roles-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getJoinRolesConfig();
    return NextResponse.json({ roles: config.roles, roleDetails: config.roleDetails ?? {} });
  } catch (err) {
    console.error("GET /api/join-roles error:", err);
    return NextResponse.json({ roles: [], roleDetails: {} });
  }
}
