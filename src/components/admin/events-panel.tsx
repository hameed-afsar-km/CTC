"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, Plus, Trash2, Edit2, Save, X, CheckCircle, Sparkles, ImagePlus, Loader2, UploadCloud } from "lucide-react";
import type { ClubEvent } from "@/lib/events";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";

const DEFAULT_EVENT_DATE = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16);

export default function EventsPanel() {
  const { getToken } = useAdmin();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
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
  });

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

  const handleEdit = (event: ClubEvent) => {
    setEditingId(event.id);
    setImageFile(null);
    setPreview(event.image);
    const dt = new Date(event.date);
    const localIso = !Number.isNaN(dt.getTime())
      ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : event.date;
    setForm({
      id: event.id,
      title: event.title,
      description: event.description,
      image: event.image,
      category: event.category,
      venue: event.venue,
      date: localIso,
      registerUrl: event.registerUrl,
    });
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
    });
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

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) throw new Error("No image selected");
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", imageFile);
    const res = await fetch("/api/admin/events/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Image upload failed");
    }
    const { imageUrl } = await res.json();
    return imageUrl as string;
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
      const token = await getToken();
      let image = form.image;
      if (imageFile) {
        image = await uploadImage();
      }
      const payload = { ...form, image, date: new Date(form.date).toISOString() };
      const res = await fetch("/api/admin/events", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save event");
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Configured Events ({events.length})</h2>
          <button
            onClick={handleResetForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Event
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState message="No events found. Create your first event using the form." />
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className={`relative p-5 rounded-2xl border transition-all ${
                editingId === evt.id
                  ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  : "bg-[#0d1317] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={evt.image}
                    alt={evt.title}
                    className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                        {evt.category}
                      </span>
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
