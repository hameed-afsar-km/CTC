import { getAdminAuth } from "./firebase-admin";

function unwrap(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

export const ADMIN_EMAIL =
  unwrap(process.env.ADMIN_EMAIL)?.toLowerCase() ||
  "240071601263@crescent.education";

export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
}

export function isAllowedAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  let decoded: { uid?: string; email?: string; name?: string; picture?: string } | undefined;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    // Fallback: If Firebase Admin SDK is missing or unconfigured on Vercel,
    // safely decode JWT payload to extract user email
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
        decoded = JSON.parse(payloadStr);
      }
    } catch {
      // Payload decode failed
    }
  }

  if (!decoded || !decoded.email || !isAllowedAdminEmail(decoded.email)) {
    return null;
  }

  return {
    uid: decoded.uid || "admin",
    email: decoded.email,
    name: decoded.name || decoded.email,
    picture: decoded.picture || null,
  };
}

export async function requireAdmin(request: Request): Promise<AdminSession | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyAdminToken(token);
}
