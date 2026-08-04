import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();

const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = (env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local"
  );
  process.exit(1);
}

const app = getApps().length ? getApp() : initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
});
const db = getFirestore(app);

const now = new Date().toISOString();
const PLACEHOLDER = "SEED - DELETE ME";

const DEFAULT_EVENTS = [
  {
    id: "codestorm-2026",
    title: "CodeStorm Hackathon",
    description: "24 hours of pure innovation. Form a team, pick a track, and ship a product from zero to hero.",
    image: "/assets/hero_3d.png",
    category: "Hackathon",
    venue: "Main Auditorium",
    date: "2026-08-14T09:00:00+05:30",
    registerUrl: "#",
  },
  {
    id: "ai-summit-2026",
    title: "AI Innovation Summit",
    description: "A full day of talks, demos, and networking with researchers building the future of intelligent systems.",
    image: "/assets/hero_crystal.png",
    category: "Summit",
    venue: "Seminar Hall B",
    date: "2026-08-28T10:00:00+05:30",
    registerUrl: "#",
  },
  {
    id: "webforge-2026",
    title: "WebForge Workshop",
    description: "Hands-on workshop covering modern full-stack development, performance, and deployment best practices.",
    image: "/assets/hero_glass_sphere.png",
    category: "Workshop",
    venue: "Innovation Lab",
    date: "2026-09-12T14:00:00+05:30",
    registerUrl: "#",
  },
  {
    id: "techtalk-scaling-2026",
    title: "TechTalk: Scaling Systems",
    description: "Engineers from leading startups break down how real products scale from a prototype to millions of users.",
    image: "/assets/bento_3d.png",
    category: "Tech Talk",
    venue: "Crescent Theater",
    date: "2026-09-26T17:00:00+05:30",
    registerUrl: "#",
  },
];

const SEEDS = {
  events: DEFAULT_EVENTS.map((event) => ({ docId: event.id, data: event })),
  applications: [
    {
      docId: "_seed-placeholder",
      data: {
        id: "_seed-placeholder",
        fullName: PLACEHOLDER,
        collegeMail: "seed@crescent.education",
        contactNumber: "0000000000",
        degree: "B.E.",
        branch: "Computer Science & Engineering",
        section: "A",
        year: "1st Year",
        interests: ["Web Development"],
        skills: ["JavaScript"],
        reason: "This is a placeholder record so the collection exists. Delete it in the admin panel.",
        linkedinUrl: "",
        githubUrl: "",
        socialMediaUrl: "",
        portfolioUrl: "",
        consented: true,
        submittedAt: now,
        status: "pending",
      },
    },
  ],
  hostit: [
    {
      docId: "_seed-placeholder",
      data: {
        id: "_seed-placeholder",
        eventType: "Workshop",
        organizerName: PLACEHOLDER,
        email: "seed@crescent.education",
        contactNumber: "0000000000",
        degree: "B.E.",
        department: "Computer Science & Engineering",
        section: "A",
        year: "1st Year",
        expectedAttendees: "50",
        description: "This is a placeholder record so the collection exists. Delete it in the admin panel.",
        proposedDate: now,
        status: "pending",
        submittedAt: now,
      },
    },
  ],
  gallery: [
    {
      docId: "_seed-placeholder",
      data: {
        id: "_seed-placeholder",
        imageUrl: "/assets/hero_3d.png",
        title: PLACEHOLDER,
        category: "Placeholder",
        description: "This is a placeholder record so the collection exists. Delete it in the admin panel.",
        date: now.slice(0, 10),
        createdAt: now,
      },
    },
  ],
  users: [
    {
      docId: "seed@crescent.education",
      data: {
        email: "seed@crescent.education",
        name: PLACEHOLDER,
        roles: [],
        sources: ["seed"],
        createdAt: now,
        updatedAt: now,
      },
    },
  ],
};

async function main() {
  console.log(`Seeding Firestore project: ${projectId}\n`);

  for (const [collection, docs] of Object.entries(SEEDS)) {
    const ref = db.collection(collection);
    const batch = db.batch();
    for (const { docId, data } of docs) {
      batch.set(ref.doc(docId), data);
    }
    await batch.commit();
    console.log(`  created/updated ${collection} (${docs.length} doc(s))`);
  }

  console.log("\nDone.");
  console.log("Open https://console.firebase.google.com/project/" + projectId + "/firestore to verify.");
  console.log(
    'Note: placeholder docs are marked "SEED - DELETE ME". Delete them via the admin panel after checking. The events collection is real seed data.'
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
