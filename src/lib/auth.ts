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
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
    // Invalid/expired tokens surface as auth/* errors → treat as "not authorized".
    // Config problems (missing/bad admin credentials) have no auth/* code → rethrow so
    // callers can return a useful message instead of a misleading "Access Denied".
    if (code.startsWith("auth/")) return null;
    throw err;
  }
  if (!isAllowedAdminEmail(decoded.email)) {
    return null;
  }
  return {
    uid: decoded.uid,
    email: decoded.email!,
    name: decoded.name || decoded.email!,
    picture: decoded.picture || null,
  };
}

export async function requireAdmin(request: Request): Promise<AdminSession | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyAdminToken(token);
}
