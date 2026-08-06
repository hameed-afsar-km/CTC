import { NextResponse } from "next/server";
import { getFocusConfig } from "@/lib/focus-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getFocusConfig();
    return NextResponse.json({ config });
  } catch (err) {
    console.error("GET /api/focus error:", err);
    return NextResponse.json({ config: null });
  }
}
