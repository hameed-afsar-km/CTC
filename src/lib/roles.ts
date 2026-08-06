export type AdminRole = "super-admin" | "admin" | "tech" | "media" | "review";

export type AdminScope =
  | "events"
  | "applications"
  | "hostit"
  | "users"
  | "gallery"
  | "logs"
  | "focus";

export const ADMIN_ROLES: AdminRole[] = [
  "super-admin",
  "admin",
  "tech",
  "media",
  "review",
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  tech: "Tech Team",
  media: "Media Team",
  review: "Review Team",
};

export const ROLE_BADGE: Record<AdminRole, string> = {
  "super-admin": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  tech: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  media: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export const SCOPE_ROLES: Record<AdminScope, AdminRole[]> = {
  events: ["super-admin", "admin", "tech"],
  applications: ["super-admin", "admin", "review"],
  hostit: ["super-admin", "admin", "review"],
  gallery: ["super-admin", "admin", "media"],
  users: ["super-admin"],
  logs: ["super-admin"],
  focus: ["super-admin", "admin", "tech"],
};

export const ALL_SCOPES: AdminScope[] = [
  "events",
  "applications",
  "hostit",
  "gallery",
  "users",
  "logs",
  "focus",
];

export function hasScope(role: AdminRole | null | undefined, scope: AdminScope): boolean {
  if (!role) return false;
  return SCOPE_ROLES[scope].includes(role);
}

export function scopesForRole(role: AdminRole | null | undefined): AdminScope[] {
  if (!role) return [];
  return ALL_SCOPES.filter((scope) => hasScope(role, scope));
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as string[]).includes(value);
}

export function resolveRole(email: string, roles: string[]): AdminRole {
  for (const role of ADMIN_ROLES) {
    if (roles.includes(role)) return role;
  }
  return "admin";
}
