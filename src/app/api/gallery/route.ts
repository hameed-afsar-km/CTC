import { NextResponse } from "next/server";
import { getGalleryItems } from "@/lib/gallery-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getGalleryItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/gallery error:", err);
    return NextResponse.json({ items: [] });
  }
}
