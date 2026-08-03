import { promises as fs } from "node:fs";
import path from "node:path";
import type { Application } from "./applications";

const STORE_PATH = path.join(process.cwd(), "data", "applications.json");

export async function getApplications(): Promise<Application[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as { applications?: Application[] };
    if (Array.isArray(parsed.applications)) {
      return parsed.applications;
    }
  } catch {
    // store not present yet
  }
  return [];
}

export async function saveApplication(application: Application): Promise<void> {
  const applications = await getApplications();
  applications.push(application);
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify({ applications }, null, 2), "utf8");
}
