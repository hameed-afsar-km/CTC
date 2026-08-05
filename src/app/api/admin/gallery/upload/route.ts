import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/auth";
import { isCloudinaryConfigured, uploadImageBuffer } from "@/lib/cloudinary";
import { logAction } from "@/lib/logs-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const access = await resolveAccess(request, "gallery");
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "unauthorized" : "forbidden" },
      { status: access.status }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");
    file = uploaded instanceof File ? uploaded : null;
  } catch {
    return NextResponse.json({ error: "invalid upload" }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file exceeds 15MB limit" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { imageUrl } = await uploadImageBuffer(buffer, {
      folder: "gallery",
      ...(file.type === "image/svg+xml" ? { format: "svg" } : {}),
    });
    await logAction(
      request,
      access.session,
      "gallery",
      "upload photo",
      `Uploaded gallery photo (${file.type}, ${Math.round(file.size / 1024)} KB)`
    );
    return NextResponse.json({ imageUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload failed" },
      { status: 500 }
    );
  }
}
