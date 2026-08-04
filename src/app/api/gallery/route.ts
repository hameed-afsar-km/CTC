import { NextResponse } from "next/server";
import { getGalleryItems } from "@/lib/gallery-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getGalleryItems();
  return NextResponse.json({ items });
}
