import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryUploadResult {
  imageUrl: string;
  publicId: string;
}

export interface CloudinaryUploadOptions {
  folder: string;
  format?: string;
  resourceType?: "image" | "auto" | "video" | "raw";
}

export function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function uploadImageBuffer(
  buffer: Buffer,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      {
        folder: options.folder,
        ...(options.format ? { format: options.format } : {}),
        ...(options.resourceType ? { resource_type: options.resourceType } : {}),
      },
      (error, result) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary upload returned no URL"));
          return;
        }
        resolve({ imageUrl: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    const result = await getCloudinary().uploader.destroy(publicId);
    return result?.result === "ok";
  } catch {
    return false;
  }
}

export function publicIdFromCloudinaryUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("res.cloudinary.com")) return null;
    const marker = "/image/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    let rest = parsed.pathname.slice(idx + marker.length);
    rest = rest.replace(/^v\d+\//, "");
    rest = rest.replace(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i, "");
    return rest || null;
  } catch {
    return null;
  }
}
