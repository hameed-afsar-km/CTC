"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Download, FileDown, Loader2, RotateCcw } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LogEntry } from "@/lib/logs-store";
import { useAdmin } from "./admin-context";
import { ADMIN_ROLES, ROLE_LABELS, ROLE_BADGE, ALL_SCOPES } from "@/lib/roles";
import type { AdminRole, AdminScope } from "@/lib/roles";
import { PanelCard, PanelHeading, EmptyState, LoadingState, inputCls } from "./ui";

const SCOPE_LABELS: Record<string, string> = {
  events: "Events",
  applications: "Applications",
  hostit: "Host'It",
  users: "Users",
  gallery: "Gallery",
  logs: "Logs",
  auth: "Auth",
};

const ROLE_FILTER_LABELS: Record<string, string> = {
  ...ROLE_LABELS,
  none: "No role",
};

type SortField = "timestamp" | "email" | "name" | "role" | "scope" | "action";
type DurationPreset = "all" | "today" | "7d" | "30d" | "custom";

const HEADERS = [
  "Day",
  "Date",
  "Time",
  "Year",
  "Name",
  "Email",
  "Role",
  "Scope",
  "Action",
  "Device",
  "IP",
  "Location",
  "Details",
];

function fmtParts(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) {
    return { day: "—", date: "—", time: "—", year: "—" };
  }
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    year: String(d.getFullYear()),
  };
}

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function LogsPanel() {
  const { getToken } = useAdmin();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<AdminScope | "all">("all");
  const [role, setRole] = useState<AdminRole | "all">("all");
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/logs", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setLoadError(`Failed to load logs (${res.status})`);
        setLogs([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.logs)) setLogs(data.logs);
    } catch {
      setLoadError("Could not reach the logs server.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const t = setTimeout(fetchLogs, 0);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  const resetFilters = () => {
    setQuery("");
    setScope("all");
    setRole("all");
    setDurationPreset("all");
    setFrom("");
    setTo("");
    setSortField("timestamp");
    setSortDir("desc");
  };

  const filtered = useMemo(() => {
    let rows = logs;

    if (now !== null) {
      if (durationPreset === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        rows = rows.filter((r) => new Date(r.timestamp).getTime() >= start.getTime());
      } else if (durationPreset === "7d") {
        rows = rows.filter((r) => new Date(r.timestamp).getTime() >= now - 7 * 86400000);
      } else if (durationPreset === "30d") {
        rows = rows.filter((r) => new Date(r.timestamp).getTime() >= now - 30 * 86400000);
      }
    }

    if (durationPreset === "custom") {
      if (from) rows = rows.filter((r) => new Date(r.timestamp).getTime() >= new Date(from).getTime());
      if (to) rows = rows.filter((r) => new Date(r.timestamp).getTime() <= new Date(to).getTime() + 59999);
    }

    if (scope !== "all") rows = rows.filter((r) => r.scope === scope);
    if (role !== "all") rows = rows.filter((r) => r.role === role);

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.name, r.email, r.role, r.scope, r.action, r.details, r.ip, r.device, r.location]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (sortField === "timestamp") {
        return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
      }
      return String(a[sortField] ?? "").localeCompare(String(b[sortField] ?? "")) * dir;
    });

    return rows;
  }, [logs, query, scope, role, durationPreset, from, to, sortField, sortDir, now]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const exportCSV = () => {
    setExporting("csv");
    const lines = [HEADERS.join(",")];
    for (const r of filtered) {
      const p = fmtParts(r.timestamp);
      lines.push(
        [p.day, p.date, p.time, p.year, r.name, r.email, r.role, r.scope, r.action, r.device, r.ip, r.location, r.details]
          .map(csvCell)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctc-activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  const exportPDF = () => {
    setExporting("pdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(12);
    doc.setTextColor(52, 211, 153);
    doc.text("CTC Admin — Activity Logs", 14, 24);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filtered.length} entries`, 14, 34);

    const body = filtered.map((r) => {
      const p = fmtParts(r.timestamp);
      return [
        p.day,
        p.date,
        p.time,
        p.year,
        r.name,
        r.email,
        r.role,
        r.scope,
        r.action,
        r.device ?? "",
        r.ip ?? "",
        r.location ?? "",
        r.details ?? "",
      ];
    });

    autoTable(doc, {
      head: [HEADERS],
      body,
      startY: 44,
      margin: { left: 14, right: 14, bottom: 24 },
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: [220, 220, 220],
        fillColor: [13, 19, 23],
        valign: "middle",
      },
      headStyles: {
        fillColor: [8, 12, 11],
        textColor: [52, 211, 153],
        fontSize: 7,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [17, 24, 29] },
    });

    doc.save(`ctc-activity-logs-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExporting(null);
  };

  const modified =
    query.trim() !== "" ||
    scope !== "all" ||
    role !== "all" ||
    durationPreset !== "all" ||
    from !== "" ||
    to !== "" ||
    sortField !== "timestamp" ||
    sortDir !== "desc";

  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelHeading
          title="Activity Logs"
          subtitle="Every admin action, timestamped with device, IP and location. Only Super Admins can view this."
        />

        {loadError && (
          <div className="mb-4 p-3 rounded-xl text-xs font-mono bg-red-950/60 border border-red-500/40 text-red-400">
            {loadError}
          </div>
        )}

        {/* Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, action, IP..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          <div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as AdminScope | "all")}
              className={inputCls}
            >
              <option value="all">All scopes</option>
              {ALL_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
              <option value="auth">Auth</option>
            </select>
          </div>

          <div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole | "all")}
              className={inputCls}
            >
              <option value="all">All roles</option>
              {ADMIN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
              <option value="none">No role</option>
            </select>
          </div>

          <div>
            <select
              value={durationPreset}
              onChange={(e) => setDurationPreset(e.target.value as DurationPreset)}
              className={inputCls}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        </div>

        {durationPreset === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase tracking-wider">From</label>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase tracking-wider">To</label>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Sort + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Sort by</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
            >
              <option value="timestamp">Timestamp</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="scope">Scope</option>
              <option value="action">Action</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 transition-all"
              title="Toggle direction"
            >
              {sortDir === "asc" ? "A → Z ↑" : "Z → A ↓"}
            </button>
            {modified && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-gray-500">
              {filtered.length} / {logs.length} entries
            </span>
            <button
              onClick={exportCSV}
              disabled={exporting !== null || filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              title="Download CSV of the currently filtered, sorted data"
            >
              {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              CSV
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting !== null || filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              title="Download PDF of the currently filtered, sorted data"
            >
              {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              PDF
            </button>
          </div>
        </div>

        {modified && (
          <p className="mt-3 text-[11px] font-mono text-emerald-400/80">
            Exports respect your current search, filters, duration and sort. {modified ? `Downloading ${filtered.length} matching entries.` : ""}
          </p>
        )}

        {/* Table */}
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <PanelCard className="mt-4">
            <EmptyState message={logs.length === 0 ? "No activity logged yet." : "No entries match your filters."} />
          </PanelCard>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-[#06090c] border-b border-white/10">
                  {HEADERS.map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300 whitespace-nowrap ${
                        i < 9 ? "cursor-pointer hover:text-emerald-200" : ""
                      }`}
                      onClick={
                        i < 9
                          ? () =>
                              toggleSort(
                                ["timestamp", "timestamp", "timestamp", "timestamp", "name", "email", "role", "scope", "action"][i] as SortField
                              )
                          : undefined
                      }
                    >
                      {h}
                      {sortField === ["timestamp", "timestamp", "timestamp", "timestamp", "name", "email", "role", "scope", "action"][i] &&
                        (sortDir === "asc" ? " ↑" : " ↓")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const p = fmtParts(r.timestamp);
                  const roleBadge = ROLE_BADGE[r.role as AdminRole] ?? "bg-white/5 text-gray-300 border-white/15";
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-300">{p.day}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-300">{p.date}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-300">{p.time}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{p.year}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-white">{r.name}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-emerald-400/90">{r.email}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${roleBadge}`}
                        >
                          {ROLE_FILTER_LABELS[r.role] ?? r.role ?? "none"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-gray-400">
                          {SCOPE_LABELS[r.scope as AdminScope] ?? r.scope}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-white/90">{r.action}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{r.device ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-gray-400">{r.ip ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{r.location ?? "—"}</td>
                      <td className="px-3 py-2.5 text-gray-400 max-w-[240px] truncate" title={r.details ?? ""}>
                        {r.details ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
