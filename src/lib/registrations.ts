export interface EventRegistration {
  id: string;
  ticketCode: string;
  eventId: string;
  eventTitle: string;
  collegeMail: string;
  fullName: string;
  registerNumber: string;
  contactNumber: string;
  degree: string;
  branch: string;
  section: string;
  year: string;
  skillLevel?: string;
  laptop?: "yes" | "no";
  githubUrl?: string;
  linkedinUrl?: string;
  expectations?: string;
  customResponses?: Record<string, string | boolean | number>;
  consented: boolean;
  status: "confirmed" | "attended" | "cancelled";
  attended?: boolean;
  attendedAt?: string | null;
  registeredAt: string;
  authUid?: string;
}

export const SKILL_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All Levels",
] as const;

export const LAPTOP_OPTIONS = [
  { value: "yes", label: "Yes, I will bring my laptop", hint: "Recommended for hands-on sessions" },
  { value: "no", label: "No, I do not have a laptop to bring", hint: "You can pair up with a peer" },
] as const;

/**
 * Generates a short, human-friendly ticket code like "WF26-8A3F"
 */
export function generateTicketCode(eventId: string): string {
  const prefix = eventId
    .split("-")
    .map((p) => p.slice(0, 2).toUpperCase())
    .join("")
    .slice(0, 4) || "CTC";
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${randomPart}`;
}

/**
 * Attempts to extract student registration number / RRN from Crescent email.
 * E.g., "240071601263@crescent.education" -> "240071601263"
 */
export function extractRegisterNumber(email: string | null | undefined): string {
  if (!email) return "";
  const localPart = email.split("@")[0] || "";
  const numericMatch = localPart.match(/^\d+/);
  return numericMatch ? numericMatch[0] : "";
}
