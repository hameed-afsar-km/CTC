import { NextResponse } from "next/server";
import { resolveAccess, bearerToken } from "@/lib/auth";
import { getFocusConfig, saveFocusConfig } from "@/lib/focus-store";
import { FOCUS_DOC_ID, type FocusConfig } from "@/lib/focus";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveAccess(request, "focus");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const config = await getFocusConfig();
    return NextResponse.json({ config });
  } catch (err) {
    console.error("GET /api/admin/focus error:", err);
    return NextResponse.json({ config: null });
  }
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request, "focus");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }
  try {
    const token = bearerToken(request);
    const body = (await request.json()) as Partial<FocusConfig>;
    if (typeof body.text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const config: FocusConfig = {
      id: FOCUS_DOC_ID,
      text: body.text.trim(),
      enabled: Boolean(body.enabled),
    };
    await saveFocusConfig(config, token);
    await logAction(
      request,
      access.session,
      "focus",
      config.enabled ? "enable focus ticker" : "disable focus ticker",
      `Focus ticker: "${config.text || "(empty)"}" (${config.enabled ? "enabled" : "disabled"})`
    );
    const updated = await getFocusConfig();
    return NextResponse.json({ config: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save focus config";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
