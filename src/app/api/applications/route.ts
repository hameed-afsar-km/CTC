import { NextResponse } from "next/server";
import { getApplications, saveApplication } from "@/lib/applications-store";
import type { Application } from "@/lib/applications";

export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = ["fullName", "collegeMail", "contactNumber", "degree", "branch", "section", "year", "reason"] as const;

export async function GET() {
  const applications = await getApplications();
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Application>;

    for (const key of REQUIRED_FIELDS) {
      if (!body[key]) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }
    if (!/^[^\s@]+@crescent\.education$/i.test(String(body.collegeMail).trim())) {
      return NextResponse.json(
        { error: "collegeMail must be an official @crescent.education address" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.interests) || body.interests.length === 0) {
      return NextResponse.json({ error: "interests are required" }, { status: 400 });
    }
    if (!Array.isArray(body.skills) || body.skills.length === 0) {
      return NextResponse.json({ error: "skills are required" }, { status: 400 });
    }
    if (!body.consented) {
      return NextResponse.json({ error: "contact consent is required" }, { status: 400 });
    }

    const application: Application = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: String(body.fullName).trim(),
      collegeMail: String(body.collegeMail).trim().toLowerCase(),
      contactNumber: String(body.contactNumber).trim(),
      degree: String(body.degree).trim(),
      branch: String(body.branch).trim(),
      section: String(body.section).trim(),
      year: String(body.year).trim(),
      interests: body.interests.map(String),
      skills: body.skills.map(String),
      reason: String(body.reason).trim(),
      linkedinUrl: String(body.linkedinUrl ?? "").trim(),
      githubUrl: String(body.githubUrl ?? "").trim(),
      socialMediaUrl: String(body.socialMediaUrl ?? "").trim(),
      portfolioUrl: String(body.portfolioUrl ?? "").trim(),
      consented: Boolean(body.consented),
      submittedAt: new Date().toISOString(),
    };

    await saveApplication(application);
    return NextResponse.json({ application }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
