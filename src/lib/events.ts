export interface EventScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export type CustomFieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "number"
  | "url";

export interface EventCustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select / radio
  helpText?: string;
}

export interface EventContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export type CertificateType = "e-certificate" | "certificate" | "both";

export interface ClubEvent {
  id: string;
  title: string;
  slug?: string;
  description: string;
  image: string;
  category: string;
  venue: string;
  date: string;
  registrationMode?: "inbuilt" | "external";
  registerUrl: string;
  registrationDeadline?: string;
  featured?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contacts?: EventContact[];
  highlights?: string[];
  dos?: string[];
  donts?: string[];
  schedule?: EventScheduleItem[];
  customFields?: EventCustomField[];
  // New perks
  registrationFeeEnabled?: boolean;
  registrationFeeAmount?: string;
  certificateEnabled?: boolean;
  certificateType?: CertificateType;
  prizeEnabled?: boolean;
  prizeAmount?: string;
  appetizersEnabled?: boolean;
  appetizersNote?: string;
}

export function generateEventSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `event-${Date.now()}`;
}

export const DEFAULT_WORKSHOP_FIELDS: EventCustomField[] = [
  {
    id: "laptop",
    label: "Will you bring a laptop?",
    type: "radio",
    required: true,
    options: ["Yes, I will bring my laptop", "No, I do not have a laptop"],
    helpText: "Hands-on coding exercises will be conducted during the session.",
  },
  {
    id: "skillLevel",
    label: "Familiarity with Workshop Topic",
    type: "select",
    required: false,
    options: ["Beginner", "Intermediate", "Advanced", "All Levels"],
    helpText: "Helps mentors calibrate the pace of the hands-on tracks.",
  },
  {
    id: "githubUrl",
    label: "GitHub Profile URL",
    type: "url",
    required: false,
    placeholder: "https://github.com/username",
  },
  {
    id: "expectations",
    label: "Questions or Topics you hope to learn",
    type: "textarea",
    required: false,
    placeholder: "What are you most excited to learn in this workshop?",
  },
];

const NO_CTA = new Set(["#", "#!", "#/", "/", ""]);

export function hasCtaLink(registerUrl?: string): boolean {
  if (!registerUrl) return false;
  const trimmed = registerUrl.trim();
  if (!trimmed) return false;
  return !NO_CTA.has(trimmed.toLowerCase());
}

export function eventCtaHref(registerUrl?: string): string {
  return hasCtaLink(registerUrl) ? registerUrl!.trim() : "/404";
}

export const defaultEvents: ClubEvent[] = [
  {
    id: "codestorm-2026",
    title: "CodeStorm Hackathon",
    description: "24 hours of pure innovation. Form a team, pick a track, and ship a product from zero to hero.",
    image: "/assets/hero_3d.png",
    category: "Hackathon",
    venue: "Main Auditorium",
    date: "2026-08-14T09:00:00+05:30",
    registerUrl: "#",
    registrationDeadline: "2026-08-12T23:59:00+05:30",
    featured: true,
    contactName: "Event Core Team",
    contactEmail: "events@crescent.education",
    contactPhone: "+91 98765 43210",
    highlights: [
      "Prize pool worth ₹50,000 across three tracks",
      "Mentor-guided builds with industry engineers",
      "Free food, swag, and certification for all participants",
    ],
    dos: [
      "Bring your own laptop and charger",
      "Form a team of up to 4 members",
      "Push code to your own repository as you build",
    ],
    donts: [
      "Don't reuse code from previous hackathons",
      "Don't build outside the assigned problem track",
      "Don't submit after the 24-hour deadline",
    ],
    schedule: [
      { time: "09:00 AM", title: "Check-in & Breakfast" },
      { time: "10:00 AM", title: "Opening Ceremony & Track Reveal", description: "Problem statements for all three tracks are announced." },
      { time: "11:00 AM", title: "Hacking Begins" },
      { time: "05:00 PM", title: "Mid-way Demo & Mentors", description: "Show progress to mentors and get course corrections." },
      { time: "11:00 PM", title: "Midnight Snack Break" },
      { time: "08:00 AM", title: "Hacking Ends & Submissions" },
      { time: "10:00 AM", title: "Judging & Prize Ceremony" },
    ],
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
    highlights: [
      "Keynotes from founders and AI researchers",
      "Live product demos and networking lounge",
      "Certificate of participation for all attendees",
    ],
    schedule: [
      { time: "09:30 AM", title: "Registration & Coffee" },
      { time: "10:00 AM", title: "Opening Keynote", description: "The state of AI in 2026 and what's next." },
      { time: "12:00 PM", title: "Panel: Building with LLMs" },
      { time: "02:00 PM", title: "Hands-on Demos" },
      { time: "04:30 PM", title: "Closing Remarks & Networking" },
    ],
  },
  {
    id: "webforge-2026",
    title: "WebForge Workshop",
    slug: "webforge-2026",
    description: "Hands-on workshop covering modern full-stack development, performance, and deployment best practices.",
    image: "/assets/hero_glass_sphere.png",
    category: "Workshop",
    venue: "Innovation Lab",
    date: "2026-09-12T14:00:00+05:30",
    registrationMode: "inbuilt",
    registerUrl: "/events/webforge-2026/register",
    customFields: DEFAULT_WORKSHOP_FIELDS,
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
