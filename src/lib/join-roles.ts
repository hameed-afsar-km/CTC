import { ROLE_LABELS } from "./roles";

export const JOIN_ROLES_DOC_ID = "join-roles";

export const ALL_JOIN_ROLES: string[] = ["member"];

export const JOIN_ROLE_LABELS: Record<string, string> = {
  ...ROLE_LABELS,
  member: "Member",
};

export const JOIN_ROLE_DESCRIPTIONS: Record<string, string> = {
  "super-admin": "Full access to every admin module.",
  admin: "Access to events, applications, gallery and ticker.",
  tech: "Access to events and the focus ticker.",
  media: "Access to the gallery.",
  review: "Access to applications and Host'It submissions.",
  member: "Standard club member with no dashboard access.",
};

export const CUSTOM_ROLE_DESCRIPTION =
  "Custom role defined by the admin. Applicants who choose it receive it as a plain role when approved.";

export interface RoleRules {
  description: string;
  rules: string[];
}

export interface JoinRolesConfig {
  id: string;
  roles: string[];
  customRoles: string[];
  deletedRoles?: string[];
  roleDetails?: Record<string, RoleRules>;
  roleLabels?: Record<string, string>;
  roleLinks?: Record<string, string>;
  updatedAt?: string;
}

// Returns the description and rules the admin configured for a role, falling
// back to the built-in description and no rules when nothing is saved yet.
export function roleDetailFor(config: JoinRolesConfig, role: string): RoleRules {
  const detail = config.roleDetails?.[role];
  return {
    description:
      typeof detail?.description === "string" && detail.description.trim()
        ? detail.description.trim()
        : JOIN_ROLE_DESCRIPTIONS[role] ?? "",
    rules: Array.isArray(detail?.rules)
      ? detail.rules.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      : [],
  };
}

export function sanitizeDeletedRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .filter((r): r is string => typeof r === "string")
        .map(normalizeCustomRole)
        .filter(Boolean)
    )
  );
}

export function sanitizeRoleDetails(raw: unknown): Record<string, RoleRules> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, RoleRules> = {};
  for (const [role, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!role || typeof value !== "object" || value === null || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    const description = typeof v.description === "string" ? v.description.trim().slice(0, 2000) : "";
    const rules = Array.isArray(v.rules)
      ? v.rules
          .filter((r): r is string => typeof r === "string")
          .map((r) => r.trim())
          .filter(Boolean)
          .slice(0, 50)
      : [];
    out[role] = { description, rules };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeRoleLabels(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [role, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!role || typeof value !== "string" || !value.trim()) continue;
    out[role] = value.trim().slice(0, 100);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeRoleLinks(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [role, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!role || typeof value !== "string" || !value.trim()) continue;
    out[role] = value.trim().slice(0, 500);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function normalizeCustomRole(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function displayJoinRole(role: string, customLabels?: Record<string, string>): string {
  if (!role) return "";
  if (customLabels && customLabels[role]) return customLabels[role];
  return (
    JOIN_ROLE_LABELS[role] ??
    role
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  );
}

export function allRolesFor(config: JoinRolesConfig): string[] {
  const deleted = new Set((config.deletedRoles ?? []).map(normalizeCustomRole));
  const combined = Array.from(
    new Set([...ALL_JOIN_ROLES, ...(config.customRoles ?? [])])
  );
  return combined.filter((r) => !deleted.has(normalizeCustomRole(r)));
}

