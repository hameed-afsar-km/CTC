import { getUser, type SiteUser } from "./users-store";
import {
  hasScopeWithPermissions,
  isAdminRole,
  resolveRole,
  type AdminRole,
  type AdminScope,
  type ScopePermissions,
} from "./roles";

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

const FALLBACK_ADMIN_EMAIL = "240071601263@crescent.education";

function parseEmailList(value: string | undefined): string[] {
  return (unwrap(value) ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0 && email.includes("@"));
}

export const ADMIN_EMAILS: string[] = Array.from(
  new Set([
    ...parseEmailList(process.env.ADMIN_EMAILS),
    ...parseEmailList(process.env.ADMIN_EMAIL),
    FALLBACK_ADMIN_EMAIL,
  ])
);

export const ADMIN_EMAIL = ADMIN_EMAILS[0] ?? FALLBACK_ADMIN_EMAIL;

const SUPER_ADMIN_EMAILS: string[] = Array.from(
  new Set([
    ...parseEmailList(process.env.SUPER_ADMIN_EMAIL),
    FALLBACK_ADMIN_EMAIL,
  ])
);

export function isSuperAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
  role: AdminRole;
  permissions: ScopePermissions;
}

export function isAllowedAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export function decodeTokenPayload(token: string): {
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadStr = Buffer.from(base64Url, "base64").toString("utf-8");
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

function roleForUser(
  email: string,
  decodedRoles: string[],
  user: SiteUser | null
): AdminRole {
  if (isSuperAdminEmail(email)) return "super-admin";
  const roles = user?.roles ?? [];
  return resolveRole(email, roles.length > 0 ? roles : decodedRoles);
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  const decoded = decodeTokenPayload(token);
  if (!decoded || !decoded.email) {
    return null;
  }
  const email = decoded.email.toLowerCase();
  let user: SiteUser | null = null;
  try {
    user = await getUser(email);
  } catch {
    user = null;
  }
  // Allow either:
  // 1) email in ADMIN_EMAILS / SUPER_ADMIN allowlist (env), OR
  // 2) existing Firestore user with at least one admin role/permissions
  const inAllowlist = isAllowedAdminEmail(email);
  const hasStoredRole =
    !!user && Array.isArray(user.roles) && user.roles.some((r) => isAdminRole(String(r)));
  const hasStoredPermissions =
    !!user?.permissions && Object.values(user.permissions).some((v) => v === true);
  if (!inAllowlist && !hasStoredRole && !hasStoredPermissions) {
    // Keep server log useful for debugging denied logins
    console.warn(`[auth] denied admin login: ${email} not in ADMIN_EMAILS and no stored role`);
    console.warn(`[auth] ADMIN_EMAILS=${ADMIN_EMAILS.join(", ")}`);
    return null;
  }
  return {
    uid: decoded.uid || "admin",
    email: decoded.email,
    name: decoded.name || decoded.email,
    picture: decoded.picture || null,
    role: roleForUser(decoded.email, [], user),
    permissions: user?.permissions ?? {},
  };
}

export async function requireAdmin(request: Request): Promise<AdminSession | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyAdminToken(token);
}

export type AccessResult =
  | { status: 200; session: AdminSession }
  | { status: 401 }
  | { status: 403 };

export async function resolveAccess(
  request: Request,
  scope: AdminScope
): Promise<AccessResult> {
  const session = await requireAdmin(request);
  if (!session) return { status: 401 };
  // Super-admins always keep full access; per-user overrides can only
  // restrict other accounts.
  const allowed = isSuperAdminEmail(session.email)
    ? true
    : hasScopeWithPermissions(session.role, session.permissions, scope);
  if (!allowed) return { status: 403 };
  return { status: 200, session };
}
