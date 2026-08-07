"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Plus, Trash2, Edit2, Save, X, CheckCircle, Sparkles, ImagePlus, Loader2, UploadCloud, Search } from "lucide-react";
import type { ClubEvent } from "@/lib/events";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getClientApp } from "@/lib/firebase-client";

const DEFAULT_EVENT_DATE = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16);

const linesToArray = (value: string): string[] =>
  value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const EMPTY_SCHEDULE_ROW = { time: "", title: "", description: "" };

export default function EventsPanel() {
  const { getToken } = useAdmin();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState<Partial<ClubEvent>>({
    title: "",
    description: "",
    image: "/assets/hero_3d.png",
    category: "Hackathon",
    venue: "Main Auditorium",
    date: DEFAULT_EVENT_DATE,
    registerUrl: "#",
    registrationDeadline: "",
    featured: false,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    highlights: [],
    dos: [],
    donts: [],
    schedule: [],
  });

  const [highlightsText, setHighlightsText] = useState("");
  const [dosText, setDosText] = useState("");
  const [dontsText, setDontsText] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/events", {
        cache: "no-store",
        headers,
      });

      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.events)) {
        setEvents(data.events);
        setMessage(null);
        return;
      }

      // Public fallback if admin endpoint fails or returns unexpected payload
      const pubRes = await fetch("/api/events", { cache: "no-store" });
      const pubData = await pubRes.json().catch(() => null);
      if (pubData && Array.isArray(pubData.events)) {
        setEvents(pubData.events);
        setMessage(null);
      }
    } catch {
      setMessage({ text: "Failed to load events", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const t = setTimeout(fetchEvents, 0);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  const categories = useMemo(
    () => Array.from(new Set(events.map((e) => e.category).filter(Boolean))).sort(),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((evt) => {
      if (categoryFilter !== "all" && evt.category !== categoryFilter) return false;
      if (!q) return true;
      return [evt.title, evt.description, evt.category, evt.venue]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [events, query, categoryFilter]);

  const handleEdit = (event: ClubEvent) => {
    setEditingId(event.id);
    setImageFile(null);
    setPreview(event.image);
    const dt = new Date(event.date);
    const localIso = !Number.isNaN(dt.getTime())
      ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : event.date;
    const regDt = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
    const regLocalIso = regDt && !Number.isNaN(regDt.getTime())
      ? new Date(regDt.getTime() - regDt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : event.registrationDeadline ?? "";
    setForm({
      id: event.id,
      title: event.title,
      description: event.description,
      image: event.image,
      category: event.category,
      venue: event.venue,
      date: localIso,
      registerUrl: event.registerUrl,
      registrationDeadline: regLocalIso,
      featured: event.featured === true,
      contactName: event.contactName ?? "",
      contactEmail: event.contactEmail ?? "",
      contactPhone: event.contactPhone ?? "",
      highlights: Array.isArray(event.highlights) ? event.highlights : [],
      dos: Array.isArray(event.dos) ? event.dos : [],
      donts: Array.isArray(event.donts) ? event.donts : [],
      schedule: Array.isArray(event.schedule) ? event.schedule : [],
    });
    setHighlightsText((Array.isArray(event.highlights) ? event.highlights : []).join("\n"));
    setDosText((Array.isArray(event.dos) ? event.dos : []).join("\n"));
    setDontsText((Array.isArray(event.donts) ? event.donts : []).join("\n"));
  };

  const handleResetForm = () => {
    setEditingId(null);
    setImageFile(null);
    setPreview(null);
    setForm({
      title: "",
      description: "",
      image: "/assets/hero_3d.png",
      category: "Hackathon",
      venue: "Main Auditorium",
      date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
      registerUrl: "#",
      registrationDeadline: "",
      featured: false,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      highlights: [],
      dos: [],
      donts: [],
      schedule: [],
    });
    setHighlightsText("");
    setDosText("");
    setDontsText("");
  };

  const handleImageFile = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) throw new Error("No image selected");
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append("file", imageFile);
      const res = await fetch("/api/admin/events/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.imageUrl) return data.imageUrl as string;
      }
    } catch {
      // Cloudinary server upload failed, fallback to Data URL
    }
    return await fileToDataUrl(imageFile);
  };

  const handleUploadImage = async () => {
    if (!imageFile) return;
    setUploadingImage(true);
    setMessage(null);
    try {
      const imageUrl = await uploadImage();
      setForm((prev) => ({ ...prev, image: imageUrl }));
      setPreview(imageUrl);
      setImageFile(null);
      setMessage({ text: "Image uploaded successfully!", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Image upload failed",
        type: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      setMessage({ text: "Title and Date are required", type: "error" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken().catch(() => null);
      let image = form.image;
      if (imageFile) {
        image = await uploadImage();
      }
      const eventId = form.id || `evt-${Date.now()}`;
      const payload: ClubEvent = {
        id: eventId,
        title: form.title,
        description: form.description ?? "",
        image: image ?? "/assets/hero_3d.png",
        category: form.category ?? "Event",
        venue: form.venue ?? "Crescent Campus",
        date: new Date(form.date).toISOString(),
        registerUrl: form.registerUrl ?? "#",
        registrationDeadline: form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString()
          : undefined,
        featured: form.featured === true,
        contactName: form.contactName?.trim() || undefined,
        contactEmail: form.contactEmail?.trim() || undefined,
        contactPhone: form.contactPhone?.trim() || undefined,
        highlights: linesToArray(highlightsText),
        dos: linesToArray(dosText),
        donts: linesToArray(dontsText),
        schedule: (form.schedule ?? []).filter(
          (row) => row.title?.trim() || row.time?.trim() || row.description?.trim()
        ),
      };

      const res = await fetch("/api/admin/events", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Direct Client-Side Firestore Fallback
        try {
          const db = getFirestore(getClientApp());
          await setDoc(doc(db, "events", eventId), payload, { merge: true });
        } catch (clientErr) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error ??
              (clientErr instanceof Error ? clientErr.message : "Failed to save event")
          );
        }
      }

      setMessage({
        text: editingId ? "Event updated successfully!" : "New event created successfully!",
        type: "success",
      });
      handleResetForm();
      await fetchEvents();
    } catch (err) {
      setMessage({
        text: err instanceof Error && err.message ? err.message : "Error saving event. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete event");
      setMessage({ text: "Event deleted successfully", type: "success" });
      await fetchEvents();
    } catch {
      setMessage({ text: "Error deleting event", type: "error" });
    }
  };

  const updateScheduleRow = (
    index: number,
    patch: Partial<{ time: string; title: string; description: string }>
  ) => {
    setForm((prev) => {
      const rows = (prev.schedule ?? []).map((row, i) =>
        i === index ? { ...row, ...patch } : row
      );
      return { ...prev, schedule: rows };
    });
  };

  const addScheduleRow = () =>
    setForm((prev) => ({
      ...prev,
      schedule: [...(prev.schedule ?? []), { ...EMPTY_SCHEDULE_ROW }],
    }));

  const removeScheduleRow = (index: number) =>
    setForm((prev) => ({
      ...prev,
      schedule: (prev.schedule ?? []).filter((_, i) => i !== index),
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form */}
      <div className="lg:col-span-5">
        <PanelCard>
          <PanelHeading
            title={editingId ? "Edit Event & Timer" : "Create New Event"}
            subtitle="The next upcoming event automatically drives the homepage countdown."
            action={
              editingId ? (
                <button
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              ) : (
                <Sparkles className="w-5 h-5 text-emerald-400" />
              )
            }
          />

          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-mono mb-5 flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-400"
                  : "bg-red-950/60 border border-red-500/40 text-red-400"
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Event Title *</label>
              <input
                type="text"
                required
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. CodeStorm Hackathon 2026"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Category</label>
                <input
                  type="text"
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Hackathon / Workshop"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Venue</label>
                <input
                  type="text"
                  value={form.venue || ""}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="Main Auditorium"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={`${labelCls} text-emerald-400 font-bold`}>
                Date & Time (Updates Homepage Countdown Timer!) *
              </label>
              <input
                type="datetime-local"
                required
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`${inputCls} font-mono text-emerald-300 border-emerald-500/40`}
              />
            </div>

            <div>
              <label className={`${labelCls} text-amber-400`}>
                Registration Deadline
              </label>
              <input
                type="datetime-local"
                value={form.registrationDeadline || ""}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                className={`${inputCls} font-mono text-amber-300 border-amber-500/40`}
              />
              <p className="mt-1.5 text-[11px] font-mono text-gray-500">
                Optional — shown on the event as the last date to register. Leave empty for no
                deadline.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Show on Homepage</p>
                <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                  Featured events appear in the home page events section. The next upcoming featured
                  event drives the homepage countdown.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.featured === true}
                onClick={() => setForm({ ...form, featured: !(form.featured === true) })}
                className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
                  form.featured === true ? "bg-emerald-500" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form.featured === true ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div>
              <label className={labelCls}>Event Image</label>
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-400/50 transition-colors p-6 bg-black/30">
                  {preview || form.image ? (
                    <img
                      src={preview ?? form.image}
                      alt="Preview"
                      className="max-h-40 rounded-xl object-cover"
                    />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-emerald-400" />
                  )}
                  <span className="text-xs font-mono text-gray-400">
                    {imageFile ? "Tap to change image" : "Choose image file (max 15MB)"}
                  </span>
                </div>
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={handleUploadImage}
                  disabled={uploadingImage}
                  className="mt-3 w-full py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-400/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      Upload Image
                    </>
                  )}
                </button>
              )}
              <div className="mt-3">
                <label className={`${labelCls} text-gray-500`}>
                  Or paste an image URL (Cloudinary, Firebase, or local path)
                </label>
                <input
                  type="text"
                  value={form.image || ""}
                  onChange={(e) => {
                    setForm({ ...form, image: e.target.value });
                    if (imageFile) setImageFile(null);
                  }}
                  placeholder="https://res.cloudinary.com/..."
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Registration Link (CTA)</label>
              <input
                type="text"
                value={form.registerUrl || ""}
                onChange={(e) => setForm({ ...form, registerUrl: e.target.value })}
                placeholder="https://example.com/register"
                className={inputCls}
              />
              <p className="mt-1.5 text-[11px] font-mono text-gray-500">
                Leave empty to point the CTA to the 404 page — a real link redirects to the
                assigned page.
              </p>
            </div>

            <div>
              <label className={`${labelCls} text-cyan-400`}>Contact Information</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={form.contactName ?? ""}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="Contact name"
                  className={inputCls}
                />
                <input
                  type="email"
                  value={form.contactEmail ?? ""}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="Contact email"
                  className={inputCls}
                />
                <input
                  type="tel"
                  value={form.contactPhone ?? ""}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="Contact phone"
                  className={inputCls}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-mono text-gray-500">
                Optional — shown in the footer of the expanded event details.
              </p>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief summary of the upcoming event..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className={labelCls}>Key Highlights</label>
              <textarea
                rows={3}
                value={highlightsText}
                onChange={(e) => setHighlightsText(e.target.value)}
                placeholder={"One highlight per line\ne.g. Prize pool worth ₹50,000"}
                className={`${inputCls} resize-none`}
              />
              <p className="mt-1.5 text-[11px] font-mono text-gray-500">
                One bullet point per line — shown in the expanded event details.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`${labelCls} text-emerald-400`}>Do&apos;s</label>
                <textarea
                  rows={4}
                  value={dosText}
                  onChange={(e) => setDosText(e.target.value)}
                  placeholder={"One per line\ne.g. Bring your own laptop"}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={`${labelCls} text-red-400`}>Don&apos;ts</label>
                <textarea
                  rows={4}
                  value={dontsText}
                  onChange={(e) => setDontsText(e.target.value)}
                  placeholder={"One per line\ne.g. Don't submit after deadline"}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={labelCls}>Event Schedule</span>
                <button
                  type="button"
                  onClick={addScheduleRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Slot
                </button>
              </div>

              {form.schedule && form.schedule.length > 0 ? (
                <div className="space-y-3">
                  {form.schedule.map((row, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2"
                    >
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <input
                          type="text"
                          value={row.time || ""}
                          onChange={(e) => updateScheduleRow(i, { time: e.target.value })}
                          placeholder="10:00 AM"
                          className={`${inputCls} font-mono`}
                        />
                        <input
                          type="text"
                          value={row.title || ""}
                          onChange={(e) => updateScheduleRow(i, { title: e.target.value })}
                          placeholder="Slot title (e.g. Opening Ceremony)"
                          className={inputCls}
                        />
                      </div>
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          value={row.description || ""}
                          onChange={(e) => updateScheduleRow(i, { description: e.target.value })}
                          placeholder="Optional: short description for this slot"
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => removeScheduleRow(i)}
                          className="shrink-0 p-2.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                          title="Remove slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] font-mono text-gray-500 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-4">
                  No schedule slots yet — add the event&apos;s timeline here.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : editingId ? "Update Event & Live Timer" : "Save Event"}
            </button>
          </form>
        </PanelCard>
      </div>

      {/* List */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-xl font-bold text-white">Configured Events ({filteredEvents.length})</h2>
          <button
            onClick={handleResetForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Event
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, category, venue..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredEvents.length === 0 ? (
          <EmptyState message="No events match this filter. Create your first event using the form." />
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`relative p-4 rounded-2xl border transition-all ${
                editingId === evt.id
                  ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  : "bg-[#0d1317] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <img
                    src={evt.image}
                    alt={evt.title}
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                        {evt.category}
                      </span>
                      {evt.featured === true && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                          ★ Homepage
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{evt.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-mono text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {new Date(evt.date).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        {evt.venue}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="mt-1.5 text-xs text-gray-400 leading-relaxed line-clamp-1">
                        {evt.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleEdit(evt)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                    title="Edit event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(evt.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
