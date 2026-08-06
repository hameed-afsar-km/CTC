import { fetchCollectionDocs, saveDocument } from "./firebase-db";
import { FOCUS_DOC_ID, type FocusConfig } from "./focus";

const COLLECTION = "settings";

export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  id: FOCUS_DOC_ID,
  text: "",
  enabled: false,
};

export async function getFocusConfig(): Promise<FocusConfig> {
  try {
    const docs = await fetchCollectionDocs(COLLECTION);
    const doc = docs.find((d) => d.id === FOCUS_DOC_ID);
    if (!doc) return { ...DEFAULT_FOCUS_CONFIG };
    return {
      id: FOCUS_DOC_ID,
      text: typeof doc.text === "string" ? doc.text : "",
      enabled: typeof doc.enabled === "boolean" ? doc.enabled : false,
      updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : undefined,
    };
  } catch (err) {
    console.error("Failed to load focus config:", err);
    return { ...DEFAULT_FOCUS_CONFIG };
  }
}

export async function saveFocusConfig(
  config: FocusConfig,
  token?: string | null
): Promise<void> {
  await saveDocument(
    COLLECTION,
    FOCUS_DOC_ID,
    {
      id: FOCUS_DOC_ID,
      text: config.text,
      enabled: config.enabled,
      updatedAt: new Date().toISOString(),
    },
    token
  );
}
