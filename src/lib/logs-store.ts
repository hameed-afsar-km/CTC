import { fetchCollectionDocs, saveDocument } from "./firebase-db";

export interface LogEntry {
  id: string;
  timestamp: string;
  email: string;
  name: string;
  role: string;
  scope: string;
  action: string;
  details?: string;
  ip: string | null;
  device: string | null;
  location: string | null;
}

const COLLECTION = "logs";

export function parseDevice(userAgent: string | null): string | null {
  if (!userAgent) return null;
  let os = "Unknown OS";
  if (/Windows NT 10/i.test(userAgent)) os = "Windows 10/11";
  else if (/Windows/i.test(userAgent)) os = "Windows";
  else if (/Mac OS X/i.test(userAgent)) os = "macOS";
  else if (/iPhone/i.test(userAgent)) os = "iPhone (iOS)";
  else if (/iPad/i.test(userAgent)) os = "iPad (iPadOS)";
  else if (/Android/i.test(userAgent)) os = "Android";
  else if (/Linux/i.test(userAgent)) os = "Linux";

  let browser = "Unknown Browser";
  if (/Edg\//.test(userAgent)) browser = "Edge";
  else if (/OPR\//.test(userAgent)) browser = "Opera";
  else if (/Chrome/.test(userAgent)) browser = "Chrome";
  else if (/Firefox/.test(userAgent)) browser = "Firefox";
  else if (/Safari/.test(userAgent)) browser = "Safari";

  return `${os} · ${browser}`;
}

export function requestMeta(request: Request): {
  ip: string | null;
  device: string | null;
  location: string | null;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  const region = request.headers.get("x-vercel-ip-country-region") || null;
  const city = request.headers.get("x-vercel-ip-city") || null;
  const location = [city, region, country].filter(Boolean).join(", ") || null;
  const device = parseDevice(request.headers.get("user-agent"));
  return { ip, device, location };
}

export async function addLog(input: {
  email: string;
  name: string;
  role: string;
  scope: string;
  action: string;
  details?: string;
  ip?: string | null;
  device?: string | null;
  location?: string | null;
}): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await saveDocument(COLLECTION, id, {
      id,
      timestamp,
      email: input.email,
      name: input.name,
      role: input.role,
      scope: input.scope,
      action: input.action,
      details: input.details ?? "",
      ip: input.ip ?? null,
      device: input.device ?? null,
      location: input.location ?? null,
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

export async function logAction(
  request: Request,
  session: { email: string; name: string; role: string },
  scope: string,
  action: string,
  details?: string
): Promise<void> {
  const meta = requestMeta(request);
  await addLog({
    email: session.email,
    name: session.name,
    role: session.role,
    scope,
    action,
    details,
    ...meta,
  });
}

export async function getLogs(): Promise<LogEntry[]> {
  const docs = await fetchCollectionDocs(COLLECTION);
  const logs = docs as unknown as LogEntry[];
  return logs
    .filter((log) => log && typeof log.timestamp === "string")
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}
