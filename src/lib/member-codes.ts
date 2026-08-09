import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SEP = ".";

// Raw member codes are never stored — Firestore is effectively public-read in
// this app. A code is derived server-side from the member's college email and
// a secret, so a valid code can only be minted where the secret lives.
// Code shape: `base64url(email).hmac-sha256(secret, "email.version")`.
// Bumping `version` invalidates previously issued codes (revocation).

const DEV_SECRET = "dev-member-code-secret-do-not-use-in-production";

function getCodeSecret(): string {
  const secret = process.env.MEMBER_CODE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MEMBER_CODE_SECRET is not set");
  }
  return DEV_SECRET;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

export function buildMemberCode(email: string, version: number): string {
  const clean = normalizeEmail(email);
  const mac = createHmac("sha256", getCodeSecret())
    .update(`${clean}.${version}`)
    .digest("hex");
  return `${base64urlEncode(clean)}${SEP}${mac}`;
}

export function hashMemberCode(code: string): string {
  return createHash("sha256").update(code, "utf-8").digest("hex");
}

export interface ParsedMemberCode {
  email: string;
  mac: string;
}

export function parseMemberCode(code: string): ParsedMemberCode | null {
  if (!code || code.length > 512) return null;
  const parts = code.split(SEP);
  if (parts.length !== 2) return null;
  let email = "";
  try {
    email = base64urlDecode(parts[0]);
  } catch {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { email: email.toLowerCase(), mac: parts[1] };
}

// Returns the member's email when the MAC matches for the given version,
// otherwise null. The version must come from the stored user record so that a
// regenerated (bumped) code invalidates all older codes.
export function verifyMemberCode(code: string, version: number): string | null {
  const parsed = parseMemberCode(code);
  if (!parsed) return null;
  const expected = createHmac("sha256", getCodeSecret())
    .update(`${parsed.email}.${version}`)
    .digest("hex");
  const a = Buffer.from(parsed.mac, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return parsed.email;
}
