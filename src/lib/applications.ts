export interface Application {
  id: string;
  type?: "join" | "role";
  fullName: string;
  collegeMail: string;
  contactNumber: string;
  role: string;
  degree: string;
  branch: string;
  section: string;
  year: string;
  interests: string[];
  skills: string[];
  reason: string;
  experience?: string;
  memberRoles?: string[];
  linkedinUrl: string;
  githubUrl: string;
  socialMediaUrl: string;
  portfolioUrl: string;
  consented: boolean;
  acceptedRoleRules?: boolean;
  submittedAt: string;
  authUid?: string;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export const DEGREES = [
  "B.E.",
  "B.Tech",
  "B.Pharm",
  "M.E.",
  "M.Tech",
  "M.Pharm",
  "BCA",
  "MCA",
  "B.Sc.",
  "M.Sc.",
  "BBA",
  "MBA",
  "Diploma",
  "Other",
];

export const BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "AI & Data Science",
  "AI & Machine Learning",
  "Biotechnology",
  "Pharmacy",
  "Biomedical Engineering",
  "Chemical Engineering",
  "Other",
];

export const SECTIONS = ["A", "B", "C", "D", "None of the above"];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Other"];

export const INTEREST_SUGGESTIONS = [
  "Web Development",
  "App Development",
  "Competitive Programming",
  "UI/UX Design",
  "AI / Machine Learning",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "Game Development",
  "Blockchain",
  "IoT",
  "Robotics",
  "Open Source",
  "DevOps",
  "Graphic Design",
  "Content Writing",
  "Public Speaking",
  "Photography",
  "Video Editing",
  "E-sports",
];

export const SKILL_SUGGESTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "SQL",
  "MongoDB",
  "Firebase",
  "Tailwind CSS",
  "Git / GitHub",
  "Docker",
  "Figma",
  "Flutter",
  "Android Development",
  "Machine Learning",
  "Problem Solving",
  "Leadership",
];

export function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(normalizeUrl(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips degree abbreviations (B.Tech, B.E., BCA, B.Pharm, etc.), department/branch
 * codes (CSE, IT, ECE, Biotechnology, Pharmacy, etc.), roll numbers, and section markers
 * from a student's Google account display name.
 */
export function cleanStudentName(rawName: string | null | undefined): string {
  if (!rawName || typeof rawName !== "string") return "";
  let name = rawName.trim();
  if (!name) return "";

  // 1. Remove bracketed / parenthesized content containing degree, branch, roll number, or section
  name = name.replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]\s*/g, (match) => {
    if (
      /\b(b\.?tech|b\.?e|m\.?tech|m\.?e|bca|mca|b\.?sc|m\.?sc|bba|mba|b\.?pharm|m\.?pharm|diploma|ph\.?d|cse|it|ece|eee|mech|civil|ai|ml|ds|biotech|pharmacy|biomedical|section|sec|\d{4,})\b/i.test(
        match
      )
    ) {
      return " ";
    }
    return match;
  });

  // 2. Handle segmented names separated by delimiters like "-", "–", "—", "|", "/", ",", ":"
  const segments = name.split(/\s*[-–—|/\\:,]+\s*/);
  if (segments.length > 1) {
    const degreeBranchPattern =
      /\b(b\.?tech|b\.?e|m\.?tech|m\.?e|bca|mca|b\.?sc|m\.?sc|bba|mba|b\.?pharm|m\.?pharm|diploma|ph\.?d|cse|it|ece|eee|mech|mechanical|civil|aids|aiml|ai|ds|ml|biotech|biotechnology|biomedical|bme|chemical|pharmacy|section|sec|year|batch)\b/i;

    const validSegments = segments.filter((seg) => {
      const s = seg.trim();
      if (!s) return false;
      if (/^\d+$/.test(s)) return false;
      if (degreeBranchPattern.test(s)) return false;
      return true;
    });

    if (validSegments.length > 0) {
      name = validSegments.join(" ");
    }
  }

  // 3. Remove standalone degree and branch words from the remaining string
  const tokensToRemove = [
    /\b(b\.?tech|b\.?e\.?|m\.?tech|m\.?e\.?|bca|mca|b\.?sc\.?|m\.?sc\.?|bba|mba|b\.?pharm\.?|m\.?pharm\.?|diploma|ph\.?d\.?)\b/gi,
    /\b(cse|it|ece|eee|mech|mechanical|civil|aids|aiml|ai\s*&\s*ds|ai\s*&\s*ml|biotech|biotechnology|bme|biomedical|pharmacy|chemical)\b/gi,
    /\b(computer\s+science(\s*&\s*eng(ineering)?)?|information\s+tech(nology)?|electronics(\s*&\s*comm(unication)?)?|electrical(\s*&\s*electronics)?)\b/gi,
    /\b(section\s*[a-d]|sec\s*[a-d]|year\s*\d|\d+(st|nd|rd|th)\s*year)\b/gi,
    /\b\d{6,}\b/g,
  ];

  for (const pattern of tokensToRemove) {
    name = name.replace(pattern, " ");
  }

  // 4. Remove leading/trailing numbers, symbols, and collapse multiple spaces
  name = name
    .replace(/^[\s\d\-–—|/\\:.,()\[\]]+/, "")
    .replace(/[\s\d\-–—|/\\:.,()\[\]]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return name || rawName.trim();
}

