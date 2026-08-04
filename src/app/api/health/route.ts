import { NextResponse } from "next/server";
import { fetchCollectionDocs } from "@/lib/firebase-db";

export const dynamic = "force-dynamic";

function flag(v: string | undefined): string {
  return v && v.trim() ? "set" : "MISSING";
}

export async function GET() {
  const env = {
    NEXT_PUBLIC_FIREBASE_API_KEY: flag(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: flag(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: flag(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: flag(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: flag(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    NEXT_PUBLIC_FIREBASE_APP_ID: flag(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: flag(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
    NEXT_PUBLIC_CLOUDINARY_API_KEY: flag(process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: flag(process.env.CLOUDINARY_API_SECRET),
    ADMIN_EMAIL: flag(process.env.ADMIN_EMAIL),
  };

  let firestore: string;
  try {
    const docs = await fetchCollectionDocs("events");
    firestore = `reachable (${docs.length} events found)`;
  } catch (err) {
    firestore = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    status: "healthy",
    env,
    effectiveAdminEmail: "240071601263@crescent.education",
    firestore,
  });
}
