import { NextResponse } from "next/server";
import { findApplicationByEmail } from "@/lib/applications-store";

export const dynamic = "force-dynamic";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "";

  if (!/^[^\s@]+@crescent\.education$/i.test(email.trim())) {
    return NextResponse.json({ appliedToday: false, nextAllowedAt: null });
  }

  const existing = await findApplicationByEmail(email.trim().toLowerCase());
  const submittedAt = existing
    ? new Date(existing.submittedAt || 0).getTime()
    : Number.NaN;

  const appliedToday =
    !!existing && Number.isFinite(submittedAt) && Date.now() - submittedAt < WINDOW_MS;

  return NextResponse.json({
    appliedToday,
    nextAllowedAt: appliedToday
      ? new Date(submittedAt + WINDOW_MS).toISOString()
      : null,
  });
}
