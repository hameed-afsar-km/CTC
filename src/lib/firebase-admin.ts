const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminApp: any = null;

export function getAdminApp() {
  if (adminApp) return adminApp;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "")
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  try {
    // Lazy require firebase-admin to prevent top-level module evaluation failures in Serverless
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cert, getApp, getApps, initializeApp } = require("firebase-admin/app");
    adminApp =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
          });
    return adminApp;
  } catch (err) {
    console.error("Failed to initialize Firebase Admin app:", err);
    return null;
  }
}

export function getAdminDb() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirestore } = require("firebase-admin/firestore");
    return getFirestore(app);
  } catch (err) {
    console.error("Failed to get Admin Firestore:", err);
    return null;
  }
}

export interface VerifiedCollegeIdentity {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
}

export async function verifyCollegeIdToken(
  token: string
): Promise<VerifiedCollegeIdentity | null> {
  const app = getAdminApp();
  if (!app || !token) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAuth } = require("firebase-admin/auth");
    const decoded = await getAuth(app).verifyIdToken(token);
    if (!decoded.email || decoded.email_verified === false) return null;
    const email = decoded.email.toLowerCase();
    if (!COLLEGE_EMAIL_RE.test(email)) return null;
    return {
      uid: decoded.uid,
      email,
      name: decoded.name || decoded.email,
      picture: decoded.picture || null,
    };
  } catch (err) {
    console.error("verifyCollegeIdToken failed:", err);
    return null;
  }
}

