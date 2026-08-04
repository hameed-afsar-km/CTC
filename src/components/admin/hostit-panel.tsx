"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, RotateCcw, Download, FileDown, Search, CalendarClock } from "lucide-react";
import type { HostitSubmission } from "@/lib/hostit-store";
import { downloadCsv, downloadPdf, type Row } from "@/lib/export-utils";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, StatusBadge } from "./ui";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;

function toExportRows(list: HostitSubmission[]): Row[] {
  return list.map((s) => ({
    Organizer: s.organizerName,
    Email: s.email,
    Contact: s.contactNumber,
    EventType: s.eventType,
    Degree: s.degree,
    Department: s.department,
    Section: s.section,
    Year: s.year,
    ExpectedAttendees: s.expectedAttendees,
    ProposedDate: s.proposedDate,
    Description: s.description,
    Status: s.status,
    SubmittedAt: new Date(s.submittedAt).toLocaleString(),
  }));
}

export default function HostitPanel() {
  const { getToken } = useAdmin();
  const [items, setItems] = useState<HostitSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/hostit", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data.submissions)) setItems(data.submissions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 0);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/hostit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await fetchAll();
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      return [s.organizerName, s.email, s.department, s.eventType, s.section, s.year]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  const exportHeaders = [
    "Organizer",
    "Email",
    "Contact",
    "EventType",
    "Degree",
    "Department",
    "Section",
    "Year",
    "ExpectedAttendees",
    "ProposedDate",
    "Description",
    "Status",
    "SubmittedAt",
  ];

  return (
    <div className="space-y-5">
      <PanelCard>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-emerald-400" />
                Host&apos;It Proposals ({filtered.length})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Review event-hosting proposals submitted through the Host&apos;It portal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCsv(toExportRows(filtered), "hostit-proposals.csv")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                CSV
              </button>
              <button
                onClick={() =>
                  downloadPdf("CTC Host'It Proposals", exportHeaders, toExportRows(filtered), "hostit-proposals.pdf")
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                PDF
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by organizer, email, department..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    filter === f
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PanelCard>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <PanelCard>
          <EmptyState message="No proposals match this filter." />
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-white/10 bg-[#0d1317] p-5 transition-all hover:border-white/20"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-white">{s.organizerName}</h3>
                    <StatusBadge status={s.status} />
                    <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                      {s.eventType || "Event"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-gray-400">
                    <span className="text-emerald-400">{s.email}</span>
                    <span>{s.contactNumber}</span>
                    <span>
                      {s.degree} • {s.department}
                      {s.section ? ` • Sec ${s.section}` : ""}
                      {s.year ? ` • ${s.year}` : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-gray-400">
                    <span>
                      Attendees: <span className="text-white">{s.expectedAttendees || "—"}</span>
                    </span>
                    <span>
                      Proposed: <span className="text-white">{s.proposedDate || "—"}</span>
                    </span>
                  </div>
                  {s.description && (
                    <p className="mt-2 text-sm text-gray-300 leading-relaxed line-clamp-2">
                      {s.description}
                    </p>
                  )}
                  <div className="mt-2 text-[10px] font-mono text-gray-500">
                    Submitted {new Date(s.submittedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setStatus(s.id, "approved")}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    title="Approve"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(s.id, "rejected")}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    title="Reject"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  {s.status !== "pending" && (
                    <button
                      onClick={() => setStatus(s.id, "pending")}
                      disabled={busyId === s.id}
                      className="inline-flex items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                      title="Reset to pending"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
