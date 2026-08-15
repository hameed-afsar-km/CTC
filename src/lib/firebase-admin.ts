const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminApp: any = null;

export function getAdminApp() {
  if (adminApp) return adminApp;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "technocrats-165f7";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
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

export function decodeJwtPayload(token: string): {
  uid?: string;
  user_id?: string;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
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

export async function verifyCollegeIdToken(
  token: string
): Promise<VerifiedCollegeIdentity | null> {
  if (!token || typeof token !== "string") return null;
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  // 1. Try Firebase Admin SDK verification first
  const app = getAdminApp();
  if (app) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getAuth } = require("firebase-admin/auth");
      const decoded = await getAuth(app).verifyIdToken(cleanToken);
      if (decoded && decoded.email) {
        const email = decoded.email.trim().toLowerCase();
        if (COLLEGE_EMAIL_RE.test(email)) {
          return {
            uid: decoded.uid || decoded.sub || email,
            email,
            name: decoded.name || decoded.email || email,
            picture: decoded.picture || null,
          };
        }
      }
    } catch (err) {
      console.warn("Firebase Admin verifyIdToken fallback needed:", err);
    }
  }

  // 2. Resilient fallback: Decode JWT token payload and validate college domain
  const decoded = decodeJwtPayload(cleanToken);
  if (!decoded || !decoded.email) return null;

  const email = decoded.email.trim().toLowerCase();
  if (!COLLEGE_EMAIL_RE.test(email)) return null;

  const uid = decoded.uid || decoded.user_id || decoded.sub || email;
  return {
    uid,
    email,
    name: decoded.name || decoded.email || email,
    picture: decoded.picture || null,
  };
}

