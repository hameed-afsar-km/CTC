"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, RotateCcw, Download, FileDown, Search, Users } from "lucide-react";
import type { Application } from "@/lib/applications";
import { downloadCsv, downloadPdf, type Row } from "@/lib/export-utils";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, StatusBadge } from "./ui";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;

function toExportRows(apps: Application[]): Row[] {
  return apps.map((a) => ({
    Name: a.fullName,
    Email: a.collegeMail,
    Contact: a.contactNumber,
    Degree: a.degree,
    Branch: a.branch,
    Section: a.section,
    Year: a.year,
    Interests: a.interests.join(", "),
    Skills: a.skills.join(", "),
    Reason: a.reason,
    LinkedIn: a.linkedinUrl,
    GitHub: a.githubUrl,
    Social: a.socialMediaUrl,
    Portfolio: a.portfolioUrl,
    Status: a.status ?? "pending",
    SubmittedAt: new Date(a.submittedAt).toLocaleString(),
  }));
}

export default function ApplicationsPanel() {
  const { getToken } = useAdmin();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/applications", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data.applications)) setApps(data.applications);
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
      const res = await fetch("/api/admin/applications", {
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
    return apps.filter((a) => {
      if (filter !== "all" && (a.status ?? "pending") !== filter) return false;
      if (!q) return true;
      return [a.fullName, a.collegeMail, a.degree, a.branch, a.section, a.year]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [apps, filter, query]);

  const exportHeaders = [
    "Name",
    "Email",
    "Contact",
    "Degree",
    "Branch",
    "Section",
    "Year",
    "Interests",
    "Skills",
    "Reason",
    "LinkedIn",
    "GitHub",
    "Social",
    "Portfolio",
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
                <Users className="w-5 h-5 text-emerald-400" />
                Join Applications ({filtered.length})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Review, approve, or reject membership requests from the join form.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCsv(toExportRows(filtered), "join-applications.csv")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                CSV
              </button>
              <button
                onClick={() =>
                  downloadPdf("CTC Join Applications", exportHeaders, toExportRows(filtered), "join-applications.pdf")
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
                placeholder="Search by name, email, degree, branch..."
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
          <EmptyState message="No applications match this filter." />
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-white/10 bg-[#0d1317] p-5 transition-all hover:border-white/20"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-white">{a.fullName}</h3>
                    <StatusBadge status={a.status ?? "pending"} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-gray-400">
                    <span className="text-emerald-400">{a.collegeMail}</span>
                    <span>{a.contactNumber}</span>
                    <span>
                      {a.degree} • {a.branch} • {a.section} • {a.year}
                    </span>
                  </div>
                  {a.reason && (
                    <p className="mt-2 text-sm text-gray-300 leading-relaxed line-clamp-2">
                      {a.reason}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.interests.slice(0, 5).map((i) => (
                      <span
                        key={i}
                        className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300"
                      >
                        {i}
                      </span>
                    ))}
                    {a.skills.slice(0, 5).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-gray-500">
                    Submitted {new Date(a.submittedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setStatus(a.id, "approved")}
                    disabled={busyId === a.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    title="Approve"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(a.id, "rejected")}
                    disabled={busyId === a.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    title="Reject"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  {(a.status ?? "pending") !== "pending" && (
                    <button
                      onClick={() => setStatus(a.id, "pending")}
                      disabled={busyId === a.id}
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
