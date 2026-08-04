import { getAdminAuth } from "./firebase-admin";

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "240071601263@crescent.education";

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
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!isAllowedAdminEmail(decoded.email)) {
      return null;
    }
    return {
      uid: decoded.uid,
      email: decoded.email!,
      name: decoded.name || decoded.email!,
      picture: decoded.picture || null,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request): Promise<AdminSession | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyAdminToken(token);
}
