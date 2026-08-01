import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultEvents, type ClubEvent } from "./events";

const STORE_PATH = path.join(process.cwd(), "data", "events.json");

export async function getEvents(): Promise<ClubEvent[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as { events?: ClubEvent[] };
    if (Array.isArray(parsed.events) && parsed.events.length > 0) {
      return parsed.events;
    }
  } catch {
    // store not present yet — fall back to bundled defaults
  }
  return defaultEvents;
}

export async function saveEvents(events: ClubEvent[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify({ events }, null, 2), "utf8");
}
