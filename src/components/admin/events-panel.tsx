"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Plus, Trash2, Edit2, Save, X, CheckCircle, Sparkles, ImagePlus, Loader2, UploadCloud, Search, Ticket, ExternalLink, ChevronUp, ChevronDown, Phone, Mail, User, IndianRupee, Award, Trophy, Utensils, GripVertical } from "lucide-react";
import type { ClubEvent, EventCustomField, CustomFieldType, EventContact } from "@/lib/events";
import { generateEventSlug, DEFAULT_WORKSHOP_FIELDS } from "@/lib/events";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getClientApp } from "@/lib/firebase-client";

const selectCls = `${inputCls} appearance-none pr-10`;

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
    slug: "",
    description: "",
    image: "/assets/hero_3d.png",
    category: "Hackathon",
    venue: "Main Auditorium",
    date: DEFAULT_EVENT_DATE,
    registrationMode: "inbuilt",
    registerUrl: "#",
    registrationDeadline: "",
    featured: false,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contacts: [],
    highlights: [],
    dos: [],
    donts: [],
    schedule: [],
    customFields: DEFAULT_WORKSHOP_FIELDS,
    registrationFeeEnabled: false,
    registrationFeeAmount: "",
    certificateEnabled: true,
    certificateType: "e-certificate",
    prizeEnabled: false,
    prizeAmount: "",
    appetizersEnabled: false,
    appetizersNote: "",
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
    const slug = event.slug || generateEventSlug(event.title);
    const regMode = event.registrationMode || (event.registerUrl?.startsWith("/events/") || event.registerUrl?.startsWith("/register") ? "inbuilt" : "external");
    const legacyContacts: EventContact[] =
      Array.isArray(event.contacts) && event.contacts.length > 0
        ? event.contacts
        : (event.contactName || event.contactEmail || event.contactPhone)
          ? [{ name: event.contactName ?? "", email: event.contactEmail ?? "", phone: event.contactPhone ?? "" }]
          : [];
    setForm({
      id: event.id,
      title: event.title,
      slug,
      description: event.description,
      image: event.image,
      category: event.category,
      venue: event.venue,
      date: localIso,
      registrationMode: regMode,
      registerUrl: regMode === "inbuilt" ? `/events/${slug}/register` : event.registerUrl,
      registrationDeadline: regLocalIso,
      featured: event.featured === true,
      contactName: event.contactName ?? "",
      contactEmail: event.contactEmail ?? "",
      contactPhone: event.contactPhone ?? "",
      contacts: legacyContacts,
      highlights: Array.isArray(event.highlights) ? event.highlights : [],
      dos: Array.isArray(event.dos) ? event.dos : [],
      donts: Array.isArray(event.donts) ? event.donts : [],
      schedule: Array.isArray(event.schedule) ? event.schedule : [],
      customFields: Array.isArray(event.customFields) && event.customFields.length > 0 ? event.customFields : DEFAULT_WORKSHOP_FIELDS,
      registrationFeeEnabled: event.registrationFeeEnabled === true,
      registrationFeeAmount: event.registrationFeeAmount ?? "",
      certificateEnabled: event.certificateEnabled !== false,
      certificateType: event.certificateType ?? "e-certificate",
      prizeEnabled: event.prizeEnabled === true,
      prizeAmount: event.prizeAmount ?? "",
      appetizersEnabled: event.appetizersEnabled === true,
      appetizersNote: event.appetizersNote ?? "",
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
      slug: "",
      description: "",
      image: "/assets/hero_3d.png",
      category: "Hackathon",
      venue: "Main Auditorium",
      date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
      registrationMode: "inbuilt",
      registerUrl: "#",
      registrationDeadline: "",
      featured: false,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contacts: [],
      highlights: [],
      dos: [],
      donts: [],
      schedule: [],
      customFields: DEFAULT_WORKSHOP_FIELDS,
      registrationFeeEnabled: false,
      registrationFeeAmount: "",
      certificateEnabled: true,
      certificateType: "e-certificate",
      prizeEnabled: false,
      prizeAmount: "",
      appetizersEnabled: false,
      appetizersNote: "",
    });
    setHighlightsText("");
    setDosText("");
    setDontsText("");
  };

  const addCustomField = () => {
    const newField: EventCustomField = {
      id: `field_${Date.now().toString(36)}`,
      label: "New Question / Field",
      type: "text",
      required: false,
      placeholder: "",
    };
    setForm((prev) => ({
      ...prev,
      customFields: [...(prev.customFields ?? []), newField],
    }));
  };

  const updateCustomField = (idx: number, patch: Partial<EventCustomField>) => {
    setForm((prev) => {
      const list = [...(prev.customFields ?? [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, customFields: list };
    });
  };

  const removeCustomField = (idx: number) => {
    setForm((prev) => {
      const list = (prev.customFields ?? []).filter((_, i) => i !== idx);
      return { ...prev, customFields: list };
    });
  };

  const moveCustomField = (idx: number, direction: -1 | 1) => {
    setForm((prev) => {
      const list = [...(prev.customFields ?? [])];
      const target = idx + direction;
      if (target < 0 || target >= list.length) return prev;
      const tmp = list[idx];
      list[idx] = list[target];
      list[target] = tmp;
      return { ...prev, customFields: list };
    });
  };

  const [draggedFieldIdx, setDraggedFieldIdx] = useState<number | null>(null);

  const handleFieldDragStart = (idx: number) => setDraggedFieldIdx(idx);
  const handleFieldDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedFieldIdx === null || draggedFieldIdx === idx) return;
  };
  const handleFieldDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedFieldIdx === null || draggedFieldIdx === idx) return;
    setForm((prev) => {
      const list = [...(prev.customFields ?? [])];
      const [dragged] = list.splice(draggedFieldIdx, 1);
      list.splice(idx, 0, dragged);
      return { ...prev, customFields: list };
    });
    setDraggedFieldIdx(null);
  };
  const handleFieldDragEnd = () => setDraggedFieldIdx(null);

  const addContact = () => {
    setForm((prev) => ({
      ...prev,
      contacts: [...(prev.contacts ?? []), { name: "", email: "", phone: "", role: "" }],
    }));
  };

  const updateContact = (idx: number, patch: Partial<EventContact>) => {
    setForm((prev) => {
      const list = [...(prev.contacts ?? [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, contacts: list };
    });
  };

  const removeContact = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      contacts: (prev.contacts ?? []).filter((_, i) => i !== idx),
    }));
  };

  const addPresetField = (preset: "laptop" | "github" | "skillLevel" | "team") => {
    let field: EventCustomField;
    if (preset === "laptop") {
      field = {
        id: "laptop",
        label: "Will you bring a laptop?",
        type: "radio",
        required: true,
        options: ["Yes, I will bring my laptop", "No, I do not have a laptop"],
        helpText: "Hands-on exercises will be conducted during the session.",
      };
    } else if (preset === "github") {
      field = {
        id: "githubUrl",
        label: "GitHub Profile URL",
        type: "url",
        required: false,
        placeholder: "https://github.com/username",
      };
    } else if (preset === "skillLevel") {
      field = {
        id: "skillLevel",
        label: "Familiarity with Topic",
        type: "select",
        required: false,
        options: ["Beginner", "Intermediate", "Advanced", "All Levels"],
        helpText: "Helps mentors calibrate the session.",
      };
    } else {
      field = {
        id: "teamName",
        label: "Team Name (if participating with team)",
        type: "text",
        required: false,
        placeholder: "e.g. Binary Beasts",
      };
    }
    setForm((prev) => ({
      ...prev,
      customFields: [...(prev.customFields ?? []), field],
    }));
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
      const slug = (form.slug || "").trim() || generateEventSlug(form.title || "new-event");
      const eventId = form.id || slug;
      const regMode = form.registrationMode === "external" ? "external" : "inbuilt";
      const registerUrl = regMode === "inbuilt" ? `/events/${slug}/register` : (form.registerUrl ?? "#");

      const sanitizedContacts: EventContact[] = (form.contacts ?? [])
        .map((c) => ({
          name: c.name?.trim() ?? "",
          email: c.email?.trim() ?? "",
          phone: c.phone?.trim() ?? "",
          role: c.role?.trim() ?? "",
        }))
        .filter((c) => c.name || c.email || c.phone);

      const primary = sanitizedContacts[0];

      const payload: ClubEvent = {
        id: eventId,
        title: form.title,
        slug,
        description: form.description ?? "",
        image: image ?? "/assets/hero_3d.png",
        category: form.category ?? "Event",
        venue: form.venue ?? "Crescent Campus",
        date: new Date(form.date).toISOString(),
        registrationMode: regMode,
        registerUrl,
        registrationDeadline: form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString()
          : undefined,
        featured: form.featured === true,
        contactName: primary?.name || form.contactName?.trim() || undefined,
        contactEmail: primary?.email || form.contactEmail?.trim() || undefined,
        contactPhone: primary?.phone || form.contactPhone?.trim() || undefined,
        contacts: sanitizedContacts.length > 0 ? sanitizedContacts : undefined,
        highlights: linesToArray(highlightsText),
        dos: linesToArray(dosText),
        donts: linesToArray(dontsText),
        schedule: (form.schedule ?? []).filter(
          (row) => row.title?.trim() || row.time?.trim() || row.description?.trim()
        ),
        customFields: form.customFields ?? DEFAULT_WORKSHOP_FIELDS,
        registrationFeeEnabled: form.registrationFeeEnabled === true,
        registrationFeeAmount: form.registrationFeeEnabled ? (form.registrationFeeAmount?.trim() || "") : "",
        certificateEnabled: form.certificateEnabled !== false,
        certificateType: form.certificateEnabled !== false ? (form.certificateType ?? "e-certificate") : undefined,
        prizeEnabled: form.prizeEnabled === true,
        prizeAmount: form.prizeEnabled ? (form.prizeAmount?.trim() || "") : "",
        appetizersEnabled: form.appetizersEnabled === true,
        appetizersNote: form.appetizersEnabled ? (form.appetizersNote?.trim() || "") : "",
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

            {/* Perk Toggles — Fee / Certificate / Prize / Appetizers */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Perks & Logistics
              </h3>

              {/* Registration Fee */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Registration Fee</p>
                    <p className="text-[11px] font-mono text-gray-500">Toggle if this event is paid</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.registrationFeeEnabled === true}
                  onClick={() => setForm({ ...form, registrationFeeEnabled: !form.registrationFeeEnabled })}
                  className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${form.registrationFeeEnabled ? "bg-amber-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.registrationFeeEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {form.registrationFeeEnabled && (
                <div>
                  <label className="text-[10px] font-mono text-gray-400 block mb-1">Fee Amount</label>
                  <input
                    type="text"
                    value={form.registrationFeeAmount ?? ""}
                    onChange={(e) => setForm({ ...form, registrationFeeAmount: e.target.value })}
                    placeholder="e.g. ₹199 or 199"
                    className={inputCls}
                  />
                </div>
              )}

              {/* Certificates */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Certificates</p>
                    <p className="text-[11px] font-mono text-gray-500">Provide certificates to participants</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.certificateEnabled !== false}
                  onClick={() => setForm({ ...form, certificateEnabled: form.certificateEnabled === false ? true : false })}
                  className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${form.certificateEnabled !== false ? "bg-sky-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.certificateEnabled !== false ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {form.certificateEnabled !== false && (
                <div>
                  <label className="text-[10px] font-mono text-gray-400 block mb-1">Certificate Type</label>
                  <select
                    value={form.certificateType ?? "e-certificate"}
                    onChange={(e) => setForm({ ...form, certificateType: e.target.value as ClubEvent["certificateType"] })}
                    className={selectCls}
                  >
                    <option value="e-certificate">E-Certificate (digital)</option>
                    <option value="certificate">Printed Certificate</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              )}

              {/* Prize */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Prize Pool</p>
                    <p className="text-[11px] font-mono text-gray-500">Toggle if winners get cash/prizes</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.prizeEnabled === true}
                  onClick={() => setForm({ ...form, prizeEnabled: !form.prizeEnabled })}
                  className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${form.prizeEnabled ? "bg-fuchsia-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.prizeEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {form.prizeEnabled && (
                <div>
                  <label className="text-[10px] font-mono text-gray-400 block mb-1">Prize Amount</label>
                  <input
                    type="text"
                    value={form.prizeAmount ?? ""}
                    onChange={(e) => setForm({ ...form, prizeAmount: e.target.value })}
                    placeholder="e.g. ₹50,000 or ₹10k + goodies"
                    className={inputCls}
                  />
                </div>
              )}

              {/* Appetizers / Refreshments */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Refreshments</p>
                    <p className="text-[11px] font-mono text-gray-500">Food / snacks / appetizers provided</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.appetizersEnabled === true}
                  onClick={() => setForm({ ...form, appetizersEnabled: !form.appetizersEnabled })}
                  className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${form.appetizersEnabled ? "bg-emerald-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.appetizersEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {form.appetizersEnabled && (
                <div>
                  <label className="text-[10px] font-mono text-gray-400 block mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={form.appetizersNote ?? ""}
                    onChange={(e) => setForm({ ...form, appetizersNote: e.target.value })}
                    placeholder="e.g. Lunch & snacks provided"
                    className={inputCls}
                  />
                </div>
              )}
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

            {/* Registration Mode & In-Built Field Builder */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 space-y-4 overflow-hidden">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-400 shrink-0" />
                    Registration Mode
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Choose whether users register directly on this website or redirect to an external link.
                  </p>
                </div>

                {/* Mode Toggle — full-width on mobile, wraps cleanly instead of overflowing card */}
                <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1 w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      const s = form.slug || generateEventSlug(form.title || "new-event");
                      setForm({
                        ...form,
                        registrationMode: "inbuilt",
                        slug: s,
                        registerUrl: `/events/${s}/register`,
                      });
                    }}
                    className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold text-center leading-tight transition-all ${
                      form.registrationMode !== "external"
                        ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    In-Built Website Form
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        registrationMode: "external",
                        registerUrl: form.registerUrl?.startsWith("/events/") ? "" : form.registerUrl,
                      })
                    }
                    className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold text-center leading-tight transition-all ${
                      form.registrationMode === "external"
                        ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    External Link
                  </button>
                </div>
              </div>

              {form.registrationMode === "external" ? (
                <div>
                  <label className={labelCls}>External Registration URL (CTA)</label>
                  <input
                    type="url"
                    value={form.registerUrl || ""}
                    onChange={(e) => setForm({ ...form, registerUrl: e.target.value })}
                    placeholder="https://devfolio.co/... or https://forms.gle/..."
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-[11px] font-mono text-gray-500">
                    Attendees clicking &quot;Register&quot; will be redirected directly to this external website.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="min-w-0">
                    <label className={labelCls}>Event Slug & Dedicated Page URL</label>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2 min-w-0">
                      <span className="hidden sm:inline-flex items-center justify-center text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl shrink-0">
                        /events/
                      </span>
                      <span className="sm:hidden text-[10px] font-mono text-gray-500">/events/</span>
                      <input
                        type="text"
                        value={form.slug || ""}
                        onChange={(e) => {
                          const s = generateEventSlug(e.target.value);
                          setForm({
                            ...form,
                            slug: s,
                            registerUrl: `/events/${s}/register`,
                          });
                        }}
                        placeholder="workshop-title-2026"
                        className={`${inputCls} font-mono min-w-0 flex-1`}
                      />
                      <span className="hidden sm:inline-flex items-center justify-center text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl shrink-0">
                        /register
                      </span>
                      <span className="sm:hidden text-[10px] font-mono text-gray-500 self-end">/register</span>
                    </div>
                    {form.slug && (
                      <div className="mt-1 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span>Page URL:</span>
                        <a
                          href={`/events/${form.slug}/register`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-emerald-300 inline-flex items-center gap-1"
                        >
                          /events/{form.slug}/register <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Form Fields Builder */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 block">
                          Custom Form Fields Builder
                        </label>
                        <p className="text-[11px] font-mono text-gray-400">
                          Standard identity fields (Name, College Email, Roll No, Dept, Year, Phone) are always collected. Configure additional fields below.
                        </p>
                      </div>

                      {/* Quick presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono text-gray-500">Presets:</span>
                        <button
                          type="button"
                          onClick={() => addPresetField("laptop")}
                          className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/20"
                        >
                          + Laptop
                        </button>
                        <button
                          type="button"
                          onClick={() => addPresetField("github")}
                          className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20"
                        >
                          + GitHub
                        </button>
                        <button
                          type="button"
                          onClick={() => addPresetField("skillLevel")}
                          className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-violet-300 border border-violet-500/20"
                        >
                          + Skill
                        </button>
                        <button
                          type="button"
                          onClick={() => addPresetField("team")}
                          className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20"
                        >
                          + Team
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(form.customFields ?? []).map((field, idx) => (
                        <div
                          key={field.id || idx}
                          draggable
                          onDragStart={() => handleFieldDragStart(idx)}
                          onDragOver={(e) => handleFieldDragOver(e, idx)}
                          onDrop={(e) => handleFieldDrop(e, idx)}
                          onDragEnd={handleFieldDragEnd}
                          className={`rounded-xl border bg-white/[0.02] p-3.5 space-y-3 transition-all ${draggedFieldIdx === idx ? "border-emerald-500/50 bg-emerald-500/5 opacity-60" : "border-white/10"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleFieldDragStart(idx);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
                                title="Drag to reorder"
                                aria-label="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Field {idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCustomField(idx)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Remove field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end">
                            <div className="lg:col-span-5">
                              <label className="text-[10px] font-mono text-gray-400 block mb-1">
                                Field Question / Label *
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) =>
                                  updateCustomField(idx, { label: e.target.value })
                                }
                                placeholder="e.g. Will you bring a laptop?"
                                className={inputCls}
                              />
                            </div>

                            <div className="lg:col-span-4">
                              <label className="text-[10px] font-mono text-gray-400 block mb-1">
                                Input Data Type *
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) =>
                                  updateCustomField(idx, {
                                    type: e.target.value as CustomFieldType,
                                  })
                                }
                                className={selectCls}
                              >
                                <option value="text">Short Text (text)</option>
                                <option value="textarea">Paragraph / Long Text (textarea)</option>
                                <option value="select">Dropdown Menu (select)</option>
                                <option value="radio">Radio Buttons (radio)</option>
                                <option value="checkbox">Single Checkbox (checkbox)</option>
                                <option value="url">URL Link (url)</option>
                                <option value="number">Numeric (number)</option>
                              </select>
                            </div>

                            <div className="lg:col-span-3 flex items-end justify-between gap-2 rounded-xl bg-black/20 border border-white/5 p-2.5">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-gray-300 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={field.required === true}
                                  onChange={(e) =>
                                    updateCustomField(idx, { required: e.target.checked })
                                  }
                                  className="rounded bg-white/10 border-white/20 text-emerald-400 shrink-0"
                                />
                                <span>Required</span>
                              </label>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveCustomField(idx, -1)}
                                  disabled={idx === 0}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveCustomField(idx, 1)}
                                  disabled={idx === (form.customFields?.length ?? 0) - 1}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {(field.type === "select" || field.type === "radio") && (
                            <div>
                              <label className="text-[10px] font-mono text-cyan-400 block mb-1">
                                Dropdown / Radio Options (comma-separated) *
                              </label>
                              <input
                                type="text"
                                value={(field.options ?? []).join(", ")}
                                onChange={(e) =>
                                  updateCustomField(idx, {
                                    options: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="e.g. Option 1, Option 2, Option 3"
                                className={`${inputCls} font-mono text-xs`}
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              value={field.placeholder ?? ""}
                              onChange={(e) =>
                                updateCustomField(idx, { placeholder: e.target.value })
                              }
                              placeholder="Placeholder text (optional)"
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={field.helpText ?? ""}
                              onChange={(e) =>
                                updateCustomField(idx, { helpText: e.target.value })
                              }
                              placeholder="Instructions / Help hint (optional)"
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 text-xs font-mono"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addCustomField}
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-emerald-400/50 hover:bg-emerald-500/5 text-xs font-mono text-gray-300 hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Form Field</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`${labelCls} text-cyan-400`}>Contact Information (Multiple)</label>
                <button
                  type="button"
                  onClick={addContact}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Contact
                </button>
              </div>
              {(form.contacts ?? []).length === 0 ? (
                <p className="text-[11px] font-mono text-gray-500 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-4">
                  No contacts added — add one or more coordinator contacts. Leave empty if not needed.
                </p>
              ) : (
                <div className="space-y-3">
                  {(form.contacts ?? []).map((contact, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Contact {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Remove contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Name *</label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              value={contact.name ?? ""}
                              onChange={(e) => updateContact(idx, { name: e.target.value })}
                              placeholder="Coordinator name"
                              className={`${inputCls} pl-8`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Role (optional)</label>
                          <input
                            type="text"
                            value={contact.role ?? ""}
                            onChange={(e) => updateContact(idx, { role: e.target.value })}
                            placeholder="e.g. Event Lead"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Email</label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="email"
                              value={contact.email ?? ""}
                              onChange={(e) => updateContact(idx, { email: e.target.value })}
                              placeholder="email@crescent.education"
                              className={`${inputCls} pl-8`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Phone</label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="tel"
                              value={contact.phone ?? ""}
                              onChange={(e) => updateContact(idx, { phone: e.target.value })}
                              placeholder="+91 98765 43210"
                              className={`${inputCls} pl-8`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[11px] font-mono text-gray-500">
                Shown in the event details footer. Add multiple contacts for different coordinators.
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
