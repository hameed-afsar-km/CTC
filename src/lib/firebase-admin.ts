import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;

let adminApp: ReturnType<typeof initializeApp> | null = null;

function getAdminApp() {
  if (adminApp) return adminApp;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  adminApp =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        });
  return adminApp;
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
    const decoded = await getAuth(app).verifyIdToken(token);
    if (!decoded.email_verified || !decoded.email) return null;
    const email = decoded.email.toLowerCase();
    if (!COLLEGE_EMAIL_RE.test(email)) return null;
    return {
      uid: decoded.uid,
      email,
      name: decoded.name || decoded.email,
      picture: decoded.picture || null,
    };
  } catch {
    return null;
  }
}
