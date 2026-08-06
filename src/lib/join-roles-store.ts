import { fetchCollectionDocs, saveDocument } from "./firebase-db";
import { JOIN_ROLES_DOC_ID, normalizeCustomRole, type JoinRolesConfig } from "./join-roles";

const COLLECTION = "settings";

export const DEFAULT_JOIN_ROLES: JoinRolesConfig = {
  id: JOIN_ROLES_DOC_ID,
  roles: ["member"],
  customRoles: [],
};

export async function getJoinRolesConfig(): Promise<JoinRolesConfig> {
  try {
    const docs = await fetchCollectionDocs(COLLECTION);
    const doc = docs.find((d) => d.id === JOIN_ROLES_DOC_ID);
    if (!doc) return { ...DEFAULT_JOIN_ROLES };
    return {
      id: JOIN_ROLES_DOC_ID,
      roles: Array.isArray(doc.roles)
        ? doc.roles.filter((r): r is string => typeof r === "string")
        : [],
      customRoles: Array.isArray(doc.customRoles)
        ? doc.customRoles
            .filter((r): r is string => typeof r === "string")
            .map(normalizeCustomRole)
            .filter(Boolean)
        : [],
      updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : undefined,
    };
  } catch (err) {
    console.error("Failed to load join roles config:", err);
    return { ...DEFAULT_JOIN_ROLES };
  }
}

export async function saveJoinRolesConfig(
  config: JoinRolesConfig,
  token?: string | null
): Promise<void> {
  const customRoles = Array.from(
    new Set(
      (config.customRoles ?? [])
        .map(normalizeCustomRole)
        .filter(Boolean)
    )
  );
  await saveDocument(
    COLLECTION,
    JOIN_ROLES_DOC_ID,
    {
      id: JOIN_ROLES_DOC_ID,
      roles: config.roles,
      customRoles,
      updatedAt: new Date().toISOString(),
    },
    token
  );
}
