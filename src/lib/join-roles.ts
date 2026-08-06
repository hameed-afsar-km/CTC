import { ADMIN_ROLES, ROLE_LABELS } from "./roles";

export const JOIN_ROLES_DOC_ID = "join-roles";

export const ALL_JOIN_ROLES: string[] = [...ADMIN_ROLES, "member"];

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

export interface JoinRolesConfig {
  id: string;
  roles: string[];
  customRoles: string[];
  updatedAt?: string;
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

export function displayJoinRole(role: string): string {
  if (!role) return "";
  return (
    JOIN_ROLE_LABELS[role] ??
    role
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  );
}

export function allRolesFor(config: JoinRolesConfig): string[] {
  return Array.from(
    new Set([...ALL_JOIN_ROLES, ...(config.customRoles ?? [])])
  );
}
