"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  RotateCcw,
  Download,
  FileDown,
  Search,
  CalendarClock,
  Eye,
  Edit2,
  Trash2,
  Save,
  Loader2,
  Mail,
  Phone,
  GraduationCap,
  Users,
  FileText,
  Calendar,
  User,
  CheckCircle2,
} from "lucide-react";
import type { HostitSubmission } from "@/lib/hostit-store";
import { downloadCsv, downloadPdf, type Row } from "@/lib/export-utils";
import { useAdmin } from "./admin-context";
import { DecisionModal, EmptyState, LoadingState, PanelCard, StatusBadge, inputCls, labelCls } from "./ui";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;

const EVENT_TYPES = ["Seminar", "Workshop", "Tech Talks", "Community Events"];

const DEGREES = [
  "B.Tech",
  "BCA",
  "B.Sc",
  "B.Com",
  "BBA",
  "B.Des",
  "B.Arch",
  "MCA",
  "M.Tech",
  "M.Sc",
  "MBA",
  "PhD",
  "Other",
];

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Artificial Intelligence & Data Science",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Biotechnology",
  "Aerospace Engineering",
  "Automobile Engineering",
  "Food Technology",
  "Polymer Technology",
  "Pharmacy",
  "Law",
  "Commerce",
  "Business Administration (BBA)",
  "Commerce (B.Com)",
  "Economics",
  "English",
  "Design (B.Des)",
  "Architecture & Planning",
  "Visual Communication",
  "Mathematics",
  "Computer Applications (BCA)",
  "Physical Education",
  "Library & Information Science",
  "Media & Communication",
  "Interdisciplinary Studies",
  "Management (MBA)",
  "Science & Humanities",
  "Other",
];

const YEARS = ["I", "II", "III", "IV", "M.Tech / M.Sc"];

const ATTENDEE_RANGES = ["Below 50", "50-100", "100-150", "150-200", "200-300", "300+"];

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${labelCls} text-[10px] uppercase`}>{label}</p>
      <div className="text-sm text-white/90">{children}</div>
    </div>
  );
}

export default function HostitPanel() {
  const { getToken } = useAdmin();
  const [items, setItems] = useState<HostitSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [viewing, setViewing] = useState<HostitSubmission | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<HostitSubmission>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [rejectTarget, setRejectTarget] = useState<HostitSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);

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

  const applyUpdate = useCallback((updated: HostitSubmission) => {
    setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setViewing((v) => (v && v.id === updated.id ? updated : v));
    setForm(updated);
  }, []);

  const confirmMessages: Record<string, string> = {
    approved: "Approve this proposal?",
    rejected: "Reject this proposal?",
    pending: "Reset this proposal back to pending?",
  };

  const setStatus = async (id: string, status: string, name?: string) => {
    const msg = confirmMessages[status];
    if (!msg) return;
    if (!window.confirm(`${msg}${name ? ` (${name})` : ""}`)) return;
    setBusyId(id);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/hostit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.submission) applyUpdate(data.submission);
        setMessage({ text: `Proposal ${status}.`, type: "success" });
      }
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (s: HostitSubmission) => {
    setRejectTarget(s);
    setRejectReason(s.rejectionReason ?? "");
    setRejectBusy(false);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejectBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/hostit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: rejectTarget.id,
          status: "rejected",
          reason: rejectReason.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to reject proposal");
      }
      const data = await res.json();
      if (data.submission) applyUpdate(data.submission);
      setMessage({ text: "Proposal rejected.", type: "success" });
      setRejectTarget(null);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to reject proposal",
        type: "error",
      });
    } finally {
      setRejectBusy(false);
    }
  };

  const openView = (s: HostitSubmission) => {
    setViewing(s);
    setForm(s);
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id) return;
    if (!form.organizerName?.trim() || !form.email?.trim()) {
      setMessage({ text: "Organizer name and email are required", type: "error" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const payload: Partial<HostitSubmission> = {
        id: form.id,
        eventType: form.eventType ?? "",
        organizerName: form.organizerName.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber?.trim() ?? "",
        degree: form.degree ?? "",
        department: form.department ?? "",
        section: form.section?.trim() ?? "",
        year: form.year ?? "",
        expectedAttendees: form.expectedAttendees ?? "",
        proposedDate: form.proposedDate?.trim() ?? "",
        description: form.description ?? "",
        status: form.status ?? "pending",
      };
      const res = await fetch("/api/admin/hostit", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update proposal");
      }
      const data = await res.json();
      if (data.submission) applyUpdate(data.submission);
      setEditing(false);
      setMessage({ text: "Proposal updated successfully.", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update proposal",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: HostitSubmission) => {
    if (!window.confirm(`Delete the proposal from ${s.organizerName}? This cannot be undone.`)) return;
    setBusyId(s.id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/hostit?id=${encodeURIComponent(s.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete proposal");
      setItems((prev) => prev.filter((x) => x.id !== s.id));
      if (viewing?.id === s.id) setViewing(null);
      setMessage({ text: "Proposal deleted.", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to delete proposal",
        type: "error",
      });
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

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 border ${
            message.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
              : "bg-red-950/60 border-red-500/40 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <X className="w-4 h-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

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
              className="rounded-2xl border border-white/10 bg-[#0d1317] p-4 transition-all hover:border-white/20"
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
                  {s.status === "rejected" && s.rejectionReason && (
                    <p className="mt-2 text-xs font-mono text-rose-300 leading-relaxed">
                      <span className="uppercase tracking-widest text-rose-400/80">Rejected: </span>
                      {s.rejectionReason}
                    </p>
                  )}
                  <div className="mt-2 text-[10px] font-mono text-gray-500">
                    Submitted {new Date(s.submittedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openView(s)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all"
                    title="View proposal"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  {s.status === "pending" && (
                    <>
                      <button
                        onClick={() => setStatus(s.id, "approved", s.organizerName)}
                        disabled={busyId === s.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        title="Approve"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => openReject(s)}
                        disabled={busyId === s.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        title="Reject"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                  {s.status !== "pending" && (
                    <button
                      onClick={() => setStatus(s.id, "pending", s.organizerName)}
                      disabled={busyId === s.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      title="Reset to pending"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded View / Edit Modal */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!saving) setViewing(null);
            }}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-[#0d1317] shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h3 className="text-xl font-bold text-white truncate">{viewing.organizerName}</h3>
                  <StatusBadge status={viewing.status} />
                  <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                    {viewing.eventType || "Event"}
                  </span>
                </div>
                <p className="text-xs font-mono text-gray-400">
                  Submitted {new Date(viewing.submittedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!saving) setViewing(null);
                  }}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {message && (
                <div
                  className={`mb-4 p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 border ${
                    message.type === "success"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                      : "bg-red-950/60 border-red-500/40 text-red-400"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Organizer Name *</label>
                      <input
                        type="text"
                        value={form.organizerName ?? ""}
                        onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Email *</label>
                      <input
                        type="email"
                        value={form.email ?? ""}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Contact Number</label>
                      <input
                        type="text"
                        value={form.contactNumber ?? ""}
                        onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Event Type</label>
                      <select
                        value={form.eventType ?? ""}
                        onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select event type</option>
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Degree</label>
                      <select
                        value={form.degree ?? ""}
                        onChange={(e) => setForm({ ...form, degree: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select degree</option>
                        {DEGREES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Department</label>
                      <select
                        value={form.department ?? ""}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Section</label>
                        <input
                          type="text"
                          value={form.section ?? ""}
                          onChange={(e) => setForm({ ...form, section: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Year</label>
                        <select
                          value={form.year ?? ""}
                          onChange={(e) => setForm({ ...form, year: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">Year</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Expected Attendees</label>
                      <select
                        value={form.expectedAttendees ?? ""}
                        onChange={(e) => setForm({ ...form, expectedAttendees: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select range</option>
                        {ATTENDEE_RANGES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Proposed Date</label>
                      <input
                        type="text"
                        value={form.proposedDate ?? ""}
                        onChange={(e) => setForm({ ...form, proposedDate: e.target.value })}
                        placeholder="e.g. March 2026"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Description / Proposal Details</label>
                    <textarea
                      rows={4}
                      value={form.description ?? ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Status</label>
                    <div className="flex items-center gap-2">
                      {(["pending", "approved", "rejected"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({ ...form, status: s })}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                            (form.status ?? "pending") === s
                              ? s === "approved"
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                : s === "rejected"
                                ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setForm(viewing);
                        setMessage(null);
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Quick status actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mr-1">
                      Update status:
                    </span>
                    {viewing.status === "pending" && (
                      <>
                        <button
                          onClick={() => setStatus(viewing.id, "approved", viewing.organizerName)}
                          disabled={busyId === viewing.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => openReject(viewing)}
                          disabled={busyId === viewing.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                    {viewing.status !== "pending" && (
                      <button
                        onClick={() => setStatus(viewing.id, "pending", viewing.organizerName)}
                        disabled={busyId === viewing.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Organizer">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.organizerName}
                      </span>
                    </Field>
                    <Field label="Contact">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.email}
                      </span>
                    </Field>
                    <Field label="Phone">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.contactNumber || "—"}
                      </span>
                    </Field>
                    <Field label="Event Type">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.eventType || "—"}
                      </span>
                    </Field>
                    <Field label="Degree">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.degree || "—"}
                      </span>
                    </Field>
                    <Field label="Department / Section / Year">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        {[viewing.department, viewing.section ? `Sec ${viewing.section}` : "", viewing.year]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </span>
                    </Field>
                    <Field label="Expected Attendees">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.expectedAttendees || "—"}
                      </span>
                    </Field>
                    <Field label="Proposed Date">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.proposedDate || "—"}
                      </span>
                    </Field>
                    <Field label="Submitted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-emerald-400" />
                        {new Date(viewing.submittedAt).toLocaleString()}
                      </span>
                    </Field>
                  </div>

                  {viewing.description && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className={`${labelCls} text-[10px] uppercase`}>Proposal Details</p>
                      <p className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                        <FileText className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400" />
                        {viewing.description}
                      </p>
                    </div>
                  )}

                  {viewing.status === "rejected" && viewing.rejectionReason && (
                    <div className="rounded-2xl border border-rose-500/25 bg-rose-950/40 p-4">
                      <p className={`${labelCls} text-[10px] uppercase text-rose-300`}>
                        Rejection reason
                      </p>
                      <p className="mt-2 text-sm text-rose-200 leading-relaxed whitespace-pre-wrap">
                        <X className="w-3.5 h-3.5 inline mr-1.5" />
                        {viewing.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!editing && (
              <div className="flex items-center justify-between gap-3 p-5 border-t border-white/10">
                <div className="text-[10px] font-mono text-gray-500">
                  {viewing.id}
                </div>
                <button
                  onClick={() => handleDelete(viewing)}
                  disabled={busyId === viewing.id}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-60"
                >
                  {busyId === viewing.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectTarget && (
        <DecisionModal
          title="Reject Proposal"
          description={`Provide a reason for rejecting this proposal from ${rejectTarget.organizerName}. The reason is stored on the proposal for reference.`}
          confirmLabel={rejectBusy ? "Rejecting..." : "Reject"}
          busy={rejectBusy}
          onCancel={() => {
            if (!rejectBusy) setRejectTarget(null);
          }}
          onConfirm={confirmReject}
        >
          <label className={labelCls}>Reason (recommended)</label>
          <textarea
            autoFocus
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Slot conflicts with another event, venue unavailable, incomplete details..."
            className={`${inputCls} resize-none`}
          />
        </DecisionModal>
      )}
    </div>
  );
}
