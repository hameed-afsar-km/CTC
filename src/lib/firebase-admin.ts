// Safe stub for Firebase Admin (bypassed in favor of Firebase Web SDK & REST API fallback)
export function getFirebaseAdminApp() {
  return null;
}

export function getDb() {
  return null;
}

export function getAdminAuth() {
  return null;
}

export function getAdminStorage() {
  return null;
}

export function getStorageBucket(): string {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (fromEnv) return fromEnv;
  return `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ctc"}.appspot.com`;
}
