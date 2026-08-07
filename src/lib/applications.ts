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
  submittedAt: string;
  authUid?: string;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export const DEGREES = [
  "B.E.",
  "B.Tech",
  "M.E.",
  "M.Tech",
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
  "Biomedical Engineering",
  "Biotechnology",
  "Chemical Engineering",
  "Other",
];

export const SECTIONS = ["A", "B", "C", "D", "E", "Other"];

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
