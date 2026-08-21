"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  RotateCcw,
  Download,
  FileDown,
  Search,
  Users,
  Eye,
  Edit2,
  Trash2,
  Save,
  Loader2,
  Mail,
  Phone,
  GraduationCap,
  CalendarClock,
  ExternalLink,
  Link2,
  User,
  MessageSquare,
  CheckCircle2,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  XCircle,
} from "lucide-react";
import {
  type Application,
  DEGREES,
  BRANCHES,
  SECTIONS,
  YEARS,
  normalizeUrl,
  isValidUrl,
} from "@/lib/applications";
import { ALL_JOIN_ROLES, displayJoinRole } from "@/lib/join-roles";
import { downloadCsv, downloadPdf, type Row } from "@/lib/export-utils";
import { useAdmin } from "./admin-context";
import { DecisionModal, EmptyState, LoadingState, PanelCard, StatusBadge, inputCls, labelCls } from "./ui";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;

// Primary classification — every application is either a new-membership
// request ("join") or an existing member applying for another role ("role").
const CLASSIFIERS = [
  { id: "all", label: "All Applications", hint: "Both classifications combined" },
  { id: "join", label: "Join Applications", hint: "New membership requests" },
  { id: "role", label: "Role Applications", hint: "Members applying for another role" },
] as const;

type ClassifierId = (typeof CLASSIFIERS)[number]["id"];

function toExportRows(apps: Application[]): Row[] {
  return apps.map((a) => ({
    Name: a.fullName,
    Type: a.type === "role" ? "Role" : "Join",
    Role: a.role ? displayJoinRole(a.role) : "Member",
    CurrentRoles: (a.memberRoles ?? []).map((r) => displayJoinRole(r)).join(", "),
    Experience: a.experience ?? "",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${labelCls} text-[10px] uppercase`}>{label}</p>
      <div className="text-sm text-white/90">{children}</div>
    </div>
  );
}

function UrlLink({ label, value }: { label: string; value: string }) {
  const href = value ? normalizeUrl(value) : "";
  if (!href) return null;
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-mono text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
    >
      <Link2 className="w-3 h-3" />
      {label}
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

export default function ApplicationsPanel() {
  const { getToken } = useAdmin();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [typeFilter, setTypeFilter] = useState<ClassifierId>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [viewing, setViewing] = useState<Application | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Application>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openDelete = (a: Application) => {
    setDeleteTarget(a);
    setDeleteReason("");
    setDeleteBusy(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      setMessage({ text: "Please enter a reason for deleting this application.", type: "error" });
      return;
    }
    setDeleteBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: deleteTarget.id,
          reason: deleteReason.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete application");
      }
      setApps((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      if (viewing?.id === deleteTarget.id) setViewing(null);
      setMessage({ text: "Application deleted successfully.", type: "success" });
      setDeleteTarget(null);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to delete application",
        type: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

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

  const applyUpdate = useCallback((updated: Application) => {
    setApps((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setViewing((v) => (v && v.id === updated.id ? updated : v));
    setForm(updated);
  }, []);

  const confirmMessages: Record<string, string> = {
    approved: "Approve this application?",
    rejected: "Reject this application?",
    pending: "Reset this application back to pending?",
  };

  const setStatus = async (id: string, status: string, name?: string) => {
    const msg = confirmMessages[status];
    if (!msg) return;
    if (!window.confirm(`${msg}${name ? ` (${name})` : ""}`)) return;
    setBusyId(id);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.application) applyUpdate(data.application);
        setMessage({ text: `Application ${status}.`, type: "success" });
      }
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (a: Application) => {
    setRejectTarget(a);
    setRejectReason(a.rejectionReason ?? "");
    setRejectBusy(false);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejectBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/applications", {
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
        throw new Error(data?.error ?? "Failed to reject application");
      }
      const data = await res.json();
      if (data.application) applyUpdate(data.application);
      setMessage({ text: "Application rejected.", type: "success" });
      setRejectTarget(null);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to reject application",
        type: "error",
      });
    } finally {
      setRejectBusy(false);
    }
  };

  const openView = (a: Application) => {
    setViewing(a);
    setForm(a);
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id) return;
    if (!form.fullName?.trim() || !form.collegeMail?.trim()) {
      setMessage({ text: "Full name and email are required", type: "error" });
      return;
    }
    for (const key of ["linkedinUrl", "githubUrl", "socialMediaUrl", "portfolioUrl"] as const) {
      if (typeof form[key] === "string" && !isValidUrl(form[key] ?? "")) {
        setMessage({ text: `${key} is not a valid URL`, type: "error" });
        return;
      }
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const payload: Partial<Application> = {
        id: form.id,
        fullName: form.fullName.trim(),
        collegeMail: form.collegeMail.trim(),
        contactNumber: form.contactNumber?.trim() ?? "",
        role: form.role?.trim() || "member",
        degree: form.degree ?? "",
        branch: form.branch ?? "",
        section: form.section ?? "",
        year: form.year ?? "",
        interests: form.interests ?? [],
        skills: form.skills ?? [],
        reason: form.reason ?? "",
        experience: form.experience ?? "",
        memberRoles: form.memberRoles ?? [],
        linkedinUrl: form.linkedinUrl?.trim() ?? "",
        githubUrl: form.githubUrl?.trim() ?? "",
        socialMediaUrl: form.socialMediaUrl?.trim() ?? "",
        portfolioUrl: form.portfolioUrl?.trim() ?? "",
        consented: form.consented ?? true,
        status: form.status ?? "pending",
      };
      const res = await fetch("/api/admin/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update application");
      }
      const data = await res.json();
      if (data.application) applyUpdate(data.application);
      setEditing(false);
      setMessage({ text: "Application updated successfully.", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update application",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Application) => {
    if (!window.confirm(`Delete the application from ${a.fullName}? This cannot be undone.`)) return;
    setBusyId(a.id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/applications?id=${encodeURIComponent(a.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete application");
      setApps((prev) => prev.filter((x) => x.id !== a.id));
      if (viewing?.id === a.id) setViewing(null);
      setMessage({ text: "Application deleted.", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to delete application",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const [openSections, setOpenSections] = useState<{
    approved: boolean;
    waiting: boolean;
    rejected: boolean;
  }>({
    approved: false,
    waiting: false,
    rejected: false,
  });

  const toggleSection = (key: "approved" | "waiting" | "rejected") => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => setOpenSections({ approved: true, waiting: true, rejected: true });
  const collapseAll = () => setOpenSections({ approved: false, waiting: false, rejected: false });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      if (filter !== "all" && (a.status ?? "pending") !== filter) return false;
      if (typeFilter !== "all" && (a.type ?? "join") !== typeFilter) return false;
      if (!q) return true;
      return [
        a.id,
        a.fullName,
        a.collegeMail,
        a.contactNumber,
        a.role,
        a.degree,
        a.department,
        a.branch,
        a.section,
        a.year,
        ...(a.interests ?? []),
        ...(a.skills ?? []),
        a.reason,
        a.experience,
        ...(a.memberRoles ?? []),
        a.linkedinUrl,
        a.githubUrl,
        a.socialMediaUrl,
        a.portfolioUrl,
        a.status ?? "pending",
        a.type ?? "join",
        a.rejectionReason,
        a.submittedAt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [apps, filter, typeFilter, query]);

  const approvedApps = useMemo(
    () => filtered.filter((a) => a.status === "approved"),
    [filtered]
  );
  const waitingApps = useMemo(
    () => filtered.filter((a) => (a.status ?? "pending") === "pending"),
    [filtered]
  );
  const rejectedApps = useMemo(
    () => filtered.filter((a) => a.status === "rejected"),
    [filtered]
  );

  const classifierCounts = useMemo(
    () => ({
      all: apps.length,
      join: apps.filter((a) => (a.type ?? "join") === "join").length,
      role: apps.filter((a) => a.type === "role").length,
    }),
    [apps]
  );

  const exportHeaders = [
    "Name",
    "Type",
    "Role",
    "Current Roles",
    "Experience",
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

  const renderCard = (a: Application) => (
    <div
      key={a.id}
      className="rounded-2xl border border-white/10 bg-[#0d1317] p-4 transition-all hover:border-white/20"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-base font-bold text-white">{a.fullName}</h3>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">
              {a.role ? displayJoinRole(a.role) : "Member"}
            </span>
            {a.type === "role" && (
              <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-300">
                Role App
              </span>
            )}
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
          {a.type === "role" && a.experience && (
            <p className="mt-2 text-xs text-gray-400 leading-relaxed line-clamp-2">
              <span className="uppercase tracking-widest text-violet-400/80">
                Experience:{" "}
              </span>
              {a.experience}
            </p>
          )}
          {(a.status ?? "pending") === "rejected" && a.rejectionReason && (
            <p className="mt-2 text-xs font-mono text-rose-300 leading-relaxed">
              <span className="uppercase tracking-widest text-rose-400/80">Rejected: </span>
              {a.rejectionReason}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.type === "role" &&
              (a.memberRoles ?? []).slice(0, 6).map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300"
                >
                  {displayJoinRole(r)}
                </span>
              ))}
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
            onClick={() => openView(a)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all"
            title="View application"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          {(a.status ?? "pending") === "pending" && (
            <>
              <button
                onClick={() => setStatus(a.id, "approved", a.fullName)}
                disabled={busyId === a.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                title="Approve"
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => openReject(a)}
                disabled={busyId === a.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                title="Reject"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}
          {(a.status ?? "pending") !== "pending" && (
            <button
              onClick={() => setStatus(a.id, "pending", a.fullName)}
              disabled={busyId === a.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              title="Reset to pending"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
          <button
            onClick={() => openDelete(a)}
            disabled={busyId === a.id}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            title="Delete application"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PanelCard>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Applications ({filtered.length})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Classified into Join and Role applications — each with approved, waiting and rejected sections.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
                title="Expand all dropdown lists"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
                title="Collapse all dropdown lists"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Collapse All
              </button>
              <button
                onClick={() => downloadCsv(toExportRows(filtered), "applications.csv")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                CSV
              </button>
              <button
                onClick={() =>
                  downloadPdf("CTC Applications", exportHeaders, toExportRows(filtered), "applications.pdf")
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                PDF
              </button>
            </div>
          </div>

          {/* Primary classification — Join vs Role applications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CLASSIFIERS.map((c) => {
              const active = typeFilter === c.id;
              const accent =
                c.id === "role"
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : c.id === "join"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-white/10 border-white/30 text-white";
              return (
                <button
                  key={c.id}
                  onClick={() => setTypeFilter(c.id)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    active ? accent : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider truncate">
                      {c.label}
                    </span>
                    <span className="block text-[10px] font-mono opacity-70 truncate mt-0.5">
                      {c.hint}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-mono font-bold ${
                      active ? "bg-black/30" : "bg-black/20"
                    }`}
                  >
                    {classifierCounts[c.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, phone, role, skills, links..."
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
                  {f === "pending" ? "waiting" : f}
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
          <EmptyState message="No applications match this filter." />
        </PanelCard>
      ) : (
        <div className="space-y-4">
          {/* 1. Approved (as a drop down list) */}
          {(filter === "all" || filter === "approved") && (
            <div className="rounded-2xl border border-emerald-500/25 bg-[#0a110e] overflow-hidden transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <button
                type="button"
                onClick={() => toggleSection("approved")}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-emerald-500/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Approved</h3>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300">
                        {approvedApps.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Approved applications with granted membership &amp; roles
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                    {openSections.approved ? "Collapse" : "Expand"}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 transition-transform duration-200 ${
                      openSections.approved ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {openSections.approved && (
                <div className="p-4 sm:p-5 pt-1 border-t border-emerald-500/15 space-y-3">
                  {approvedApps.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-gray-500">
                      No approved applications found.
                    </div>
                  ) : (
                    approvedApps.map(renderCard)
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Waiting (as a drop down list) */}
          {(filter === "all" || filter === "pending") && (
            <div className="rounded-2xl border border-amber-500/25 bg-[#120f0a] overflow-hidden transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <button
                type="button"
                onClick={() => toggleSection("waiting")}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-amber-500/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Waiting</h3>
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-300">
                        {waitingApps.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Pending submissions waiting for team review
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                    {openSections.waiting ? "Collapse" : "Expand"}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 transition-transform duration-200 ${
                      openSections.waiting ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {openSections.waiting && (
                <div className="p-4 sm:p-5 pt-1 border-t border-amber-500/15 space-y-3">
                  {waitingApps.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-gray-500">
                      No waiting applications at the moment.
                    </div>
                  ) : (
                    waitingApps.map(renderCard)
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Rejected (as a drop down list) */}
          {(filter === "all" || filter === "rejected") && (
            <div className="rounded-2xl border border-rose-500/25 bg-[#140a0c] overflow-hidden transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <button
                type="button"
                onClick={() => toggleSection("rejected")}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-rose-500/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Rejected</h3>
                      <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs font-mono font-bold text-rose-300">
                        {rejectedApps.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rejected applications with review notes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                    {openSections.rejected ? "Collapse" : "Expand"}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 transition-transform duration-200 ${
                      openSections.rejected ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {openSections.rejected && (
                <div className="p-4 sm:p-5 pt-1 border-t border-rose-500/15 space-y-3">
                  {rejectedApps.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-gray-500">
                      No rejected applications found.
                    </div>
                  ) : (
                    rejectedApps.map(renderCard)
                  )}
                </div>
              )}
            </div>
          )}
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
                  <h3 className="text-xl font-bold text-white truncate">{viewing.fullName}</h3>
                  <StatusBadge status={viewing.status ?? "pending"} />
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
                      <label className={labelCls}>Full Name *</label>
                      <input
                        type="text"
                        value={form.fullName ?? ""}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>College Email *</label>
                      <input
                        type="email"
                        value={form.collegeMail ?? ""}
                        onChange={(e) => setForm({ ...form, collegeMail: e.target.value })}
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
                      <label className={labelCls}>Role Applying For</label>
                      <select
                        value={form.role ?? ""}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select role</option>
                        {[
                          ...ALL_JOIN_ROLES,
                          ...((form.role && !ALL_JOIN_ROLES.includes(form.role))
                            ? [form.role]
                            : []),
                        ].map((r) => (
                          <option key={r} value={r}>{displayJoinRole(r)}</option>
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
                      <label className={labelCls}>Branch</label>
                      <select
                        value={form.branch ?? ""}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select branch</option>
                        {BRANCHES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Section</label>
                        <select
                          value={form.section ?? ""}
                          onChange={(e) => setForm({ ...form, section: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">Section</option>
                          {SECTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
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
                      <label className={labelCls}>Interests (comma separated)</label>
                      <input
                        type="text"
                        value={(form.interests ?? []).join(", ")}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            interests: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Skills (comma separated)</label>
                      <input
                        type="text"
                        value={(form.skills ?? []).join(", ")}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      {form.type === "role"
                        ? "Why do they want this role? (Reason)"
                        : "Why do you want to join? (Reason)"}
                    </label>
                    <textarea
                      rows={3}
                      value={form.reason ?? ""}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  {form.type === "role" && (
                    <div>
                      <label className={labelCls}>Relevant Experience</label>
                      <textarea
                        rows={3}
                        value={form.experience ?? ""}
                        onChange={(e) => setForm({ ...form, experience: e.target.value })}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>LinkedIn</label>
                      <input
                        type="text"
                        value={form.linkedinUrl ?? ""}
                        onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>GitHub</label>
                      <input
                        type="text"
                        value={form.githubUrl ?? ""}
                        onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Social Media</label>
                      <input
                        type="text"
                        value={form.socialMediaUrl ?? ""}
                        onChange={(e) => setForm({ ...form, socialMediaUrl: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Portfolio</label>
                      <input
                        type="text"
                        value={form.portfolioUrl ?? ""}
                        onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                        className={inputCls}
                      />
                    </div>
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
                    {(viewing.status ?? "pending") === "pending" && (
                      <>
                        <button
                          onClick={() => setStatus(viewing.id, "approved", viewing.fullName)}
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
                    {(viewing.status ?? "pending") !== "pending" && (
                      <button
                        onClick={() => setStatus(viewing.id, "pending", viewing.fullName)}
                        disabled={busyId === viewing.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Contact">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.collegeMail}
                      </span>
                    </Field>
                    <Field label="Phone">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.contactNumber || "—"}
                      </span>
                    </Field>
                    <Field label="Role Applying For">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.role ? displayJoinRole(viewing.role) : "Member"}
                      </span>
                    </Field>
                    {viewing.type === "role" && (
                      <Field label="Current Roles">
                        <span className="inline-flex items-center gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-violet-400" />
                          {(viewing.memberRoles ?? []).length
                            ? viewing.memberRoles!.map((r) => displayJoinRole(r)).join(", ")
                            : "—"}
                        </span>
                      </Field>
                    )}
                    <Field label="Degree">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                        {viewing.degree || "—"}
                      </span>
                    </Field>
                    <Field label="Branch / Section / Year">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {[viewing.branch, viewing.section, viewing.year].filter(Boolean).join(" • ") || "—"}
                      </span>
                    </Field>
                    <Field label="Submitted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-emerald-400" />
                        {new Date(viewing.submittedAt).toLocaleString()}
                      </span>
                    </Field>
                    <Field label="Consent">
                      <span className={viewing.consented ? "text-emerald-400" : "text-rose-400"}>
                        {viewing.consented ? "Consented" : "Not consented"}
                      </span>
                    </Field>
                  </div>

                  <div>
                    <p className={`${labelCls} text-[10px] uppercase`}>Interests</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {viewing.interests.length ? (
                        viewing.interests.map((i) => (
                          <span
                            key={i}
                            className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-mono text-emerald-300"
                          >
                            {i}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className={`${labelCls} text-[10px] uppercase`}>Skills</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {viewing.skills.length ? (
                        viewing.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 text-[11px] font-mono text-cyan-300"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </div>
                  </div>

                  {viewing.reason && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className={`${labelCls} text-[10px] uppercase`}>
                        {viewing.type === "role"
                          ? "Why they want this role"
                          : "Why they want to join"}
                      </p>
                      <p className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                        <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400" />
                        {viewing.reason}
                      </p>
                    </div>
                  )}

                  {viewing.type === "role" && viewing.experience && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className={`${labelCls} text-[10px] uppercase`}>
                        Relevant experience
                      </p>
                      <p className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                        <BadgeCheck className="w-3.5 h-3.5 inline mr-1.5 text-violet-400" />
                        {viewing.experience}
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

                  <div>
                    <p className={`${labelCls} text-[10px] uppercase`}>Links</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {viewing.linkedinUrl && <UrlLink label="LinkedIn" value={viewing.linkedinUrl} />}
                      {viewing.githubUrl && <UrlLink label="GitHub" value={viewing.githubUrl} />}
                      {viewing.socialMediaUrl && <UrlLink label="Social" value={viewing.socialMediaUrl} />}
                      {viewing.portfolioUrl && <UrlLink label="Portfolio" value={viewing.portfolioUrl} />}
                      {!viewing.linkedinUrl &&
                        !viewing.githubUrl &&
                        !viewing.socialMediaUrl &&
                        !viewing.portfolioUrl && (
                          <span className="text-sm text-gray-500">No links provided</span>
                        )}
                    </div>
                  </div>
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
                  onClick={() => openDelete(viewing)}
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
          title="Reject Application"
          description={`Provide a reason for rejecting ${rejectTarget.fullName}. The reason is stored on the application for reference.`}
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
            placeholder="e.g. Missing mandatory details, not a current student, seats are full..."
            className={`${inputCls} resize-none`}
          />
        </DecisionModal>
      )}

      {/* Delete application modal */}
      {deleteTarget && (
        <DecisionModal
          title="Delete Application"
          description={`Permanently delete the application submitted by ${deleteTarget.fullName}. Please provide a reason for deleting this application.`}
          confirmLabel={deleteBusy ? "Deleting..." : "Delete Application"}
          busy={deleteBusy}
          onCancel={() => {
            if (!deleteBusy) setDeleteTarget(null);
          }}
          onConfirm={confirmDelete}
        >
          <label className={labelCls}>Deletion Reason *</label>
          <textarea
            autoFocus
            rows={4}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="e.g. Duplicate submission, invalid details, requested by applicant..."
            className={`${inputCls} resize-none`}
          />
        </DecisionModal>
      )}
    </div>
  );
}
