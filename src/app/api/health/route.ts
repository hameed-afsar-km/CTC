import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

function flag(v: string | undefined): string {
  return v && v.trim() ? "set" : "MISSING";
}

function privateKeyDiagnostics(): string {
  const value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) return "not set";
  const hasBegin = /BEGIN (?:[A-Z ]*)?PRIVATE KEY/.test(value);
  const hasEnd = /END (?:[A-Z ]*)?PRIVATE KEY/.test(value);
  const startsQuote = value.trim().startsWith('"') || value.trim().startsWith("'");
  const escapedN = /\\n/.test(value);
  const realN = /\n/.test(value);
  return `len=${value.length} begin=${hasBegin} end=${hasEnd} quotes=${startsQuote} escapedN=${escapedN} realNewlines=${realN}`;
}

function effectiveAdminEmail(): string {
  let raw = process.env.ADMIN_EMAIL ?? "";
  raw = raw.trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  return (raw || "240071601263@crescent.education").toLowerCase();
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
    FIREBASE_PROJECT_ID: flag(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: flag(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: flag(process.env.FIREBASE_PRIVATE_KEY),
    FIREBASE_STORAGE_BUCKET: flag(process.env.FIREBASE_STORAGE_BUCKET),
    ADMIN_EMAIL: flag(process.env.ADMIN_EMAIL),
  };

  let firebaseAdmin: string;
  let firestore: string;
  try {
    firebaseAdmin = "initialized";
    const db = getDb();
    if (db) {
      await db.collection("_healthcheck").limit(1).get();
      firestore = "reachable";
    } else {
      firestore = "unconfigured (using REST API fallback)";
    }
  } catch (err) {
    firebaseAdmin = err instanceof Error ? err.message : String(err);
    firestore = "not attempted";
  }

  return NextResponse.json({
    env,
    privateKey: privateKeyDiagnostics(),
    effectiveAdminEmail,
    firebaseAdmin,
    firestore,
  });
}
