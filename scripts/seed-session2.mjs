import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// One-off: creates the "…Drug–Cell Response Data – Session 2" event and links it to
// Session 1 via the session attendance gate (attendees of Session 1 are excluded).

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing .env.local in project root.");
    process.exit(1);
  }
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = (env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const app = getApps().length ? getApp() : initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
});
const db = getFirestore(app);

const SLUG = "workshop-ai-assisted-analysis-and-visualization-of-drug-cell-response-data-session-2";

const session2 = {
  id: SLUG,
  slug: SLUG,
  title: "Workshop: AI-Assisted Analysis and Visualization of Drug–Cell Response Data - Session 2",
  description:
    "Session 2 of the AI-Assisted Analysis and Visualization of Drug–Cell Response Data workshop.\nDive deeper into advanced AI analytics, model-assisted interpretation, and building richer Power BI dashboards from drug–cell response datasets.",
  category: "Workshop",
  venue: "CSE Lab",
  date: "2026-09-07T04:00:00.000Z", // 7 Sep 2026, 9:30 AM IST
  registrationMode: "inbuilt",
  registerUrl: `/events/${SLUG}/register`,
  image: "/assets/hero_3d.png",
  featured: false,
  registrationsOpen: true,
  certificateEnabled: true,
  certificateType: "e-certificate",
  registrationFeeEnabled: false,
  prizeEnabled: false,
  appetizersEnabled: false,
  highlights: [
    "🧬 Advanced drug–cell response analysis",
    "🤖 Deeper AI-assisted interpretation",
    "📊 Building richer Power BI dashboards",
    "🔍 Cross-validation of AI findings",
  ],
  dos: [
    "Understand what each dataset variable means.",
    "Verify AI-generated findings before concluding.",
    "Focus on meaningful biological patterns.",
    "Ask questions and experiment with the dashboard.",
  ],
  donts: [
    "Don't blindly trust AI results.",
    "Don't make medical conclusions from the dataset.",
    "Don't alter data to produce desired results.",
    "Don't confuse patterns with proven biological effects.",
  ],
  schedule: [
    { time: "9:15 AM", title: "Initiation of the Workshop", description: "" },
    { time: "10:40 AM", title: "Break", description: "" },
    { time: "11:00 AM", title: "Second Half – Advanced AI Technical Setup", description: "" },
    { time: "12:40 PM", title: "Lunch", description: "" },
    { time: "1:40 PM", title: "Hands-on Advanced Analysis & Dashboard", description: "" },
    { time: "4:00 PM", title: "End of Workshop", description: "" },
  ],
  customFields: [
    {
      id: "skillLevel",
      label: "Familiarity with Workshop Topic",
      type: "select",
      required: true,
      options: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      helpText: "Helps mentors calibrate the pace of the hands-on tracks.",
    },
    {
      id: "expectations",
      label: "Questions or Topics you hope to learn",
      type: "textarea",
      required: false,
      placeholder: "What are you most excited to learn in this session?",
    },
  ],
  // Session Attendance Gate: excludes members who attended Session 1.
  excludeAttendeesOfEventId: "evt-1787849196175",
  excludeAttendeesMessage:
    "You have already attended the first session (Workshop: AI-Assisted Analysis and Visualization of Drug–Cell Response Data). We must allot space to other members, so registration for Session 2 is not available to you.",
};

await db.collection("events").doc(session2.id).set(session2, { merge: true });
console.log(`Created/updated event: ${session2.id}`);
console.log(`  title: ${session2.title}`);
console.log(`  date:  ${session2.date}`);
console.log(`  gate:  excludes attendees of ${session2.excludeAttendeesOfEventId}`);
console.log("Done.");