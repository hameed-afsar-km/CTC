"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileDown,
  Search,
  Eye,
  Trash2,
  Loader2,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Check,
  UserCheck,
  Camera,
  Plus,
  Save,
  Edit2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { EventRegistration } from "@/lib/registrations";
import { DEGREES, BRANCHES, YEARS, SECTIONS } from "@/lib/applications";
import type { ClubEvent, EventCustomField } from "@/lib/events";
import { defaultEvents } from "@/lib/events";
import { downloadCsv, downloadPdf, type Row } from "@/lib/export-utils";
import { useAdmin } from "./admin-context";
import { DecisionModal, EmptyState, LoadingState, PanelCard } from "./ui";
import QrScannerModal from "./qr-scanner-modal";

const BRANCH_OPTIONS = [
  "All Branches",
  "Computer Science & Engineering",
  "Information Technology",
  "AI & Data Science",
  "AI & Machine Learning",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Biotechnology",
  "Pharmacy",
  "Other",
];

const YEAR_OPTIONS = ["All Years", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

function toCsvRows(regs: EventRegistration[], customFields?: EventCustomField[]): Row[] {
  return regs.map((r) => {
    const row: Row = {
      "Registration ID": r.id,
      "Ticket Code": r.ticketCode,
      "Event ID": r.eventId,
      "Event Title": r.eventTitle,
      "Full Name": r.fullName,
      "College Email": r.collegeMail,
      "Register Number": r.registerNumber,
      "Contact Number": r.contactNumber,
      Degree: r.degree,
      Branch: r.branch,
      Section: r.section,
      Year: r.year,
      Status: r.status,
      "Attended / Checked-in": r.attended ? "Yes" : "No",
      "Checked-in At": r.attendedAt ? new Date(r.attendedAt).toLocaleString() : "",
      "Registered At": new Date(r.registeredAt).toLocaleString(),
    };

    if (customFields && customFields.length > 0) {
      customFields.forEach((cf) => {
        const val = r.customResponses?.[cf.id] ?? (r as unknown as Record<string, unknown>)[cf.id] ?? "";
        row[cf.label] = typeof val === "boolean" ? (val ? "Yes" : "No") : String(val ?? "");
      });
    } else if (r.customResponses) {
      Object.entries(r.customResponses).forEach(([k, v]) => {
        if (!row[k]) row[k] = String(v);
      });
    }

    return row;
  });
}

export default function RegistrationsPanel() {
  const { getToken } = useAdmin();

  const [events, setEvents] = useState<ClubEvent[]>(defaultEvents);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("All Branches");
  const [yearFilter, setYearFilter] = useState("All Years");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "attended" | "pending">("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name" | "roll">("date-desc");

  const [viewingReg, setViewingReg] = useState<EventRegistration | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<EventRegistration | null>(null);
  const [savingReg, setSavingReg] = useState(false);
  const [regFormError, setRegFormError] = useState<string | null>(null);
  const [regForm, setRegForm] = useState({
    eventId: "",
    collegeMail: "",
    fullName: "",
    registerNumber: "",
    contactNumber: "",
    degree: "B.Tech",
    branch: "Computer Science & Engineering",
    section: "A",
    year: "2nd Year",
    status: "confirmed",
  });

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events) && data.events.length > 0) {
            setEvents(data.events);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch events:", err);
      }
    }
    fetchEvents();
  }, []);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const url =
        selectedEventId === "all"
          ? "/api/admin/registrations"
          : `/api/admin/registrations?eventId=${encodeURIComponent(selectedEventId)}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
      }
    } catch (err) {
      console.error("Failed to load registrations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, selectedEventId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleCheckInById = async (regId: string, attended: boolean): Promise<boolean> => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ id: regId, attended }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registration) {
          setRegistrations((prev) => prev.map((r) => (r.id === regId ? data.registration : r)));
          if (viewingReg && viewingReg.id === regId) setViewingReg(data.registration);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update check-in status:", err);
      return false;
    }
  };

  const handleToggleAttendance = async (reg: EventRegistration) => {
    const nextAttended = !reg.attended;
    setBusyId(reg.id);
    await handleCheckInById(reg.id, nextAttended);
    setBusyId(null);
  };

  const handleDeleteRegistration = async () => {
    if (!deletingId) return;
    setBusyId(deletingId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/registrations?id=${encodeURIComponent(deletingId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setRegistrations((prev) => prev.filter((r) => r.id !== deletingId));
        if (viewingReg && viewingReg.id === deletingId) setViewingReg(null);
        setDeletingId(null);
      }
    } catch (err) {
      console.error("Failed to delete registration:", err);
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setEditingReg(null);
    setRegFormError(null);
    setRegForm({
      eventId: selectedEventId !== "all" ? selectedEventId : (events[0]?.id || ""),
      collegeMail: "",
      fullName: "",
      registerNumber: "",
      contactNumber: "",
      degree: "B.Tech",
      branch: "Computer Science & Engineering",
      section: "A",
      year: "2nd Year",
      status: "confirmed",
    });
    setFormOpen(true);
  };

  const openEdit = (r: EventRegistration) => {
    setEditingReg(r);
    setRegFormError(null);
    setRegForm({
      eventId: r.eventId,
      collegeMail: r.collegeMail,
      fullName: r.fullName,
      registerNumber: r.registerNumber,
      contactNumber: r.contactNumber,
      degree: r.degree,
      branch: r.branch,
      section: r.section,
      year: r.year,
      status: r.status,
    });
    setFormOpen(true);
  };

  const saveRegistrationForm = async () => {
    setRegFormError(null);
    if (!regForm.eventId) return setRegFormError("Please choose an event.");
    if (!regForm.collegeMail.trim()) return setRegFormError("College email is required.");
    if (!/^[^\s@]+@crescent\.education$/i.test(regForm.collegeMail.trim())) {
      return setRegFormError("College email must end in @crescent.education.");
    }
    if (!regForm.fullName.trim()) return setRegFormError("Full name is required.");
    if (!regForm.registerNumber.trim()) return setRegFormError("Register number is required.");
    if (!regForm.contactNumber.trim()) return setRegFormError("Contact number is required.");

    setSavingReg(true);
    try {
      const token = await getToken();
      const method = editingReg ? "PUT" : "POST";
      const res = await fetch("/api/admin/registrations", {
        method,
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          ...(editingReg ? { id: editingReg.id } : {}),
          ...regForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegFormError(data.error || "Failed to save registration.");
        return;
      }
      if (data.registration) {
        setRegistrations((prev) => {
          const exists = prev.some((r) => r.id === data.registration.id);
          return exists
            ? prev.map((r) => (r.id === data.registration.id ? data.registration : r))
            : [data.registration, ...prev];
        });
      }
      setFormOpen(false);
      setEditingReg(null);
    } catch (err) {
      console.error("Failed to save registration:", err);
      setRegFormError("Network error. Please try again.");
    } finally {
      setSavingReg(false);
    }
  };

  const filteredRegistrations = useMemo(() => {
    return registrations
      .filter((r) => {
        if (selectedEventId !== "all" && r.eventId !== selectedEventId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const searchableValues = [
            r.fullName,
            r.collegeMail,
            r.registerNumber,
            r.contactNumber,
            r.ticketCode,
            r.eventTitle,
            r.eventId,
            r.id,
            r.degree,
            r.branch,
            r.section,
            r.year,
            r.status,
            r.skillLevel,
            r.laptop,
            r.githubUrl,
            r.linkedinUrl,
            r.expectations,
            r.attended ? "attended" : "",
            r.attended ? "checked in" : "pending",
            r.attendedAt || "",
            r.registeredAt,
          ];
          if (r.customResponses) {
            Object.values(r.customResponses).forEach((v) => searchableValues.push(String(v)));
          }
          const match = searchableValues.some((v) => v && String(v).toLowerCase().includes(q));
          if (!match) return false;
        }
        if (branchFilter !== "All Branches") {
          if (branchFilter === "Other") {
            if (BRANCH_OPTIONS.slice(1, -1).some((b) => b.toLowerCase() === r.branch.toLowerCase())) return false;
          } else if (r.branch.toLowerCase() !== branchFilter.toLowerCase()) return false;
        }
        if (yearFilter !== "All Years" && r.year !== yearFilter) return false;
        if (attendanceFilter === "attended" && !r.attended) return false;
        if (attendanceFilter === "pending" && r.attended) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.fullName.localeCompare(b.fullName);
        if (sortBy === "roll") return a.registerNumber.localeCompare(b.registerNumber);
        if (sortBy === "date-asc") return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
        return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      });
  }, [registrations, selectedEventId, searchQuery, branchFilter, yearFilter, attendanceFilter, sortBy]);

  const stats = useMemo(() => {
    const total = filteredRegistrations.length;
    const attended = filteredRegistrations.filter((r) => r.attended).length;
    const pending = total - attended;
    const branchCounts: Record<string, number> = {};
    filteredRegistrations.forEach((r) => {
      const b = r.branch || "Other";
      branchCounts[b] = (branchCounts[b] || 0) + 1;
    });
    const topBranch = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      total,
      attended,
      pending,
      attendancePct: total > 0 ? Math.round((attended / total) * 100) : 0,
      topBranch: topBranch ? `${topBranch[0]} (${topBranch[1]})` : "—",
    };
  }, [filteredRegistrations]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const handleExportCsv = () => {
    const targetEvent = events.find((e) => e.id === selectedEventId || (e.slug && e.slug === selectedEventId));
    const rows = toCsvRows(filteredRegistrations, targetEvent?.customFields);
    const eventName = selectedEventId === "all" ? "all-events" : selectedEventId.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    downloadCsv(rows, `ctc-registrations-${eventName}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPdf = async () => {
    const eventName = selectedEventId === "all" ? "All Events" : selectedEvent?.title || selectedEventId;
    const title = `${eventName} — Registrations`;
    const headers = ["Ticket", "Name", "Register No", "Email", "Branch", "Year", "Checked-in"];
    const rows = filteredRegistrations.map((r) => ({
      Ticket: r.ticketCode,
      Name: r.fullName,
      "Register No": r.registerNumber,
      Email: r.collegeMail,
      Branch: r.branch,
      Year: `${r.year} / Sec ${r.section}`,
      "Checked-in": r.attended ? "Yes" : "No",
    }));
    await downloadPdf(title, headers, rows, `ctc-registrations-${selectedEventId}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PanelCard>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              Registrations
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {selectedEventId === "all" ? "All events" : selectedEvent?.title || selectedEventId} · {stats.total} registered
              {stats.total > 0 && ` · ${stats.attended} checked in`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#0e161c] text-white">All Events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-[#0e161c] text-white">
                    {ev.title} — {ev.category}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] active:scale-95 shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan QR Pass</span>
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Registration</span>
            </button>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchRegistrations();
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={handleExportCsv}
              disabled={filteredRegistrations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>

            <button
              onClick={handleExportPdf}
              disabled={filteredRegistrations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 transition-colors disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/70">Total Registered</p>
            <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            <p className="text-[11px] font-mono text-gray-500 mt-1">{selectedEventId === "all" ? "across all events" : "for this event"}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Checked In</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.attended}</p>
            <p className="text-[11px] font-mono text-gray-500 mt-1">{stats.attendancePct}% attendance</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Pending</p>
            <p className="text-2xl font-black text-amber-300 mt-1">{stats.pending}</p>
            <p className="text-[11px] font-mono text-gray-500 mt-1">not yet checked in</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Top Branch</p>
            <p className="text-sm font-bold text-white mt-1 truncate" title={stats.topBranch}>{stats.topBranch}</p>
            <p className="text-[11px] font-mono text-gray-500 mt-1">most registrations</p>
          </div>
        </div>
      </PanelCard>

      {/* Filters */}
      <PanelCard>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, phone, register no, ticket, event..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono placeholder:text-gray-500 focus:outline-none focus:border-emerald-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs">✕</button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-400">
              {BRANCH_OPTIONS.map((br) => (
                <option key={br} value={br} className="bg-[#0e161c] text-white">{br}</option>
              ))}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-400">
              {YEAR_OPTIONS.map((yr) => (
                <option key={yr} value={yr} className="bg-[#0e161c] text-white">{yr}</option>
              ))}
            </select>
            <select value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value as never)} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-400">
              <option value="all" className="bg-[#0e161c]">All statuses</option>
              <option value="attended" className="bg-[#0e161c]">Checked in</option>
              <option value="pending" className="bg-[#0e161c]">Pending</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as never)} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-400">
              <option value="date-desc" className="bg-[#0e161c]">Newest first</option>
              <option value="date-asc" className="bg-[#0e161c]">Oldest first</option>
              <option value="name" className="bg-[#0e161c]">Name A–Z</option>
              <option value="roll" className="bg-[#0e161c]">Register No</option>
            </select>
          </div>
        </div>
      </PanelCard>

      {/* List */}
      <PanelCard className="p-0 overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : filteredRegistrations.length === 0 ? (
          <EmptyState message={searchQuery || branchFilter !== "All Branches" || yearFilter !== "All Years" || attendanceFilter !== "all" ? "No registrations match the current filters." : "No registrations yet for this selection."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-mono uppercase tracking-widest text-gray-500">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Register No</th>
                  <th className="px-4 py-3 font-medium">Branch & Year</th>
                  {selectedEventId === "all" && <th className="px-4 py-3 font-medium">Event</th>}
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Check-in</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRegistrations.map((r) => {
                  const isBusy = busyId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center text-[11px] font-bold text-emerald-300 shrink-0">
                            {r.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate max-w-[180px]">{r.fullName}</div>
                            <div className="text-[11px] font-mono text-gray-500 truncate max-w-[180px]">{r.collegeMail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono text-gray-300">{r.registerNumber}</span>
                        <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{r.contactNumber}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-gray-200 truncate max-w-[170px]">{r.branch}</div>
                        <div className="text-[10px] font-mono text-gray-500">{r.degree} · {r.year} · Sec {r.section}</div>
                      </td>
                      {selectedEventId === "all" && (
                        <td className="px-4 py-3.5">
                          <span className="inline-flex max-w-[160px] truncate rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-mono text-gray-300" title={r.eventTitle}>{r.eventTitle}</span>
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-cyan-300">{r.ticketCode}</span>
                        <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{new Date(r.registeredAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(r)}
                          disabled={isBusy}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border ${r.attended ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.35)]" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"} disabled:opacity-50`}
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : r.attended ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {r.attended ? "Checked in" : "Mark in"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingReg(r)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="View details"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEdit(r)} className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors" title="Edit registration"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeletingId(r.id)} className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      {/* Details modal */}
      {viewingReg && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#0d1317] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block mb-1">Registration · {viewingReg.ticketCode}</span>
                <h3 className="text-lg font-bold text-white truncate">{viewingReg.fullName}</h3>
                <p className="text-xs font-mono text-gray-400 truncate">{viewingReg.collegeMail}</p>
              </div>
              <button onClick={() => setViewingReg(null)} className="shrink-0 h-8 w-8 grid place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Register No</span>
                <span className="text-white font-semibold">{viewingReg.registerNumber}</span>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Contact</span>
                <a href={`https://wa.me/${viewingReg.contactNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1"><Phone className="w-3 h-3" />{viewingReg.contactNumber}</a>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Branch</span>
                <span className="text-white">{viewingReg.branch}</span>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Year & Section</span>
                <span className="text-white">{viewingReg.degree} · {viewingReg.year} · Sec {viewingReg.section}</span>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 col-span-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Event</span>
                <span className="text-white">{viewingReg.eventTitle}</span>
                <span className="text-gray-500 ml-2">({viewingReg.eventId})</span>
              </div>
            </div>

            {viewingReg.customResponses && Object.keys(viewingReg.customResponses).length > 0 && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-300">Event Answers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(viewingReg.customResponses).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-black/40 border border-white/5 p-3">
                      <span className="text-[10px] font-mono text-gray-400 block capitalize">{k}</span>
                      <span className="text-xs font-medium text-white break-words">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-black/60 border border-white/10 p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-2 rounded-xl shrink-0">
                <QRCodeSVG value={`CTC-VERIFY:${viewingReg.id}:${viewingReg.ticketCode}:${viewingReg.collegeMail}`} size={96} />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="text-xs font-mono font-bold text-white">Ticket <span className="text-emerald-400">{viewingReg.ticketCode}</span></div>
                <p className="text-[11px] font-mono text-gray-500">Registered {new Date(viewingReg.registeredAt).toLocaleString()}</p>
                {viewingReg.attended && <p className="text-[11px] font-mono text-emerald-400 flex items-center justify-center sm:justify-start gap-1"><CheckCircle2 className="w-3 h-3" />Checked in {viewingReg.attendedAt ? new Date(viewingReg.attendedAt).toLocaleString() : ""}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { const r = viewingReg; setViewingReg(null); openEdit(r); }} className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                <button type="button" onClick={() => setDeletingId(viewingReg.id)} className="inline-flex items-center gap-1.5 text-xs font-mono text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" />Delete</button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleToggleAttendance(viewingReg)} disabled={busyId === viewingReg.id} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${viewingReg.attended ? "bg-white/10 hover:bg-white/20 text-gray-300" : "bg-emerald-500 hover:bg-emerald-400 text-black"}`}>
                  {viewingReg.attended ? "Undo check-in" : "Mark checked-in"}
                </button>
                <button type="button" onClick={() => setViewingReg(null)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0d1317] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block mb-1">
                  {editingReg ? "Edit Registration" : "New Registration"}
                </span>
                <h3 className="text-lg font-bold text-white truncate">
                  {editingReg ? editingReg.fullName : "Register a student"}
                </h3>
              </div>
              <button onClick={() => setFormOpen(false)} className="shrink-0 h-8 w-8 grid place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">✕</button>
            </div>

            {regFormError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">{regFormError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Event</label>
                <select
                  value={regForm.eventId}
                  onChange={(e) => setRegForm({ ...regForm, eventId: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="" className="bg-[#0e161c] text-white">Select event...</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} className="bg-[#0e161c] text-white">{ev.title} — {ev.category}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">College Email (@crescent.education)</label>
                <input
                  type="text"
                  value={regForm.collegeMail}
                  onChange={(e) => setRegForm({ ...regForm, collegeMail: e.target.value })}
                  placeholder="240071601234@crescent.education"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Full Name</label>
                <input
                  type="text"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  placeholder="Student's full name"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Register No (RRN)</label>
                <input
                  type="text"
                  value={regForm.registerNumber}
                  onChange={(e) => setRegForm({ ...regForm, registerNumber: e.target.value })}
                  placeholder="e.g. 240071601234"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Contact Number</label>
                <input
                  type="text"
                  value={regForm.contactNumber}
                  onChange={(e) => setRegForm({ ...regForm, contactNumber: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Degree</label>
                <select
                  value={regForm.degree}
                  onChange={(e) => setRegForm({ ...regForm, degree: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                >
                  {DEGREES.map((d) => <option key={d} value={d} className="bg-[#0e161c] text-white">{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Branch</label>
                <select
                  value={regForm.branch}
                  onChange={(e) => setRegForm({ ...regForm, branch: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                >
                  {BRANCHES.map((b) => <option key={b} value={b} className="bg-[#0e161c] text-white">{b}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Section</label>
                <select
                  value={regForm.section}
                  onChange={(e) => setRegForm({ ...regForm, section: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                >
                  {SECTIONS.map((s) => <option key={s} value={s} className="bg-[#0e161c] text-white">{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Year</label>
                <select
                  value={regForm.year}
                  onChange={(e) => setRegForm({ ...regForm, year: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                >
                  {YEARS.map((y) => <option key={y} value={y} className="bg-[#0e161c] text-white">{y}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Status</label>
                <select
                  value={regForm.status}
                  onChange={(e) => setRegForm({ ...regForm, status: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="confirmed" className="bg-[#0e161c] text-white">Confirmed</option>
                  <option value="attended" className="bg-[#0e161c] text-white">Attended (checked in)</option>
                  <option value="cancelled" className="bg-[#0e161c] text-white">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white">Cancel</button>
              <button
                type="button"
                onClick={saveRegistrationForm}
                disabled={savingReg}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {savingReg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingReg ? "Save Changes" : "Create Registration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <DecisionModal
          title="Delete registration?"
          description="This permanently removes the registration. The student can register again if the event is still open."
          confirmLabel="Delete"
          confirmTone="danger"
          busy={busyId === deletingId}
          onCancel={() => setDeletingId(null)}
          onConfirm={handleDeleteRegistration}
        />
      )}

      {/* Live Door QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        registrations={registrations}
        onCheckIn={handleCheckInById}
        selectedEventId={selectedEventId}
      />
    </div>
  );
}
