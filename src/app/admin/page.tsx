"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClubEvent } from "@/lib/events";
import { defaultEvents } from "@/lib/events";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

const DEFAULT_EVENT_DATE = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16);

export default function AdminPage() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
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
      const res = await fetch("/api/events", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents(defaultEvents);
      }
    } catch {
      setEvents(defaultEvents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEvents, 0);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  const handleEdit = (event: ClubEvent) => {
    setEditingId(event.id);
    // Format date string for datetime-local input (YYYY-MM-DDTHH:mm)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      setMessage({ text: "Title and Date are required", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);

    // Format ISO string with timezone offset info
    const isoDate = new Date(form.date).toISOString();

    const payload = {
      ...form,
      date: isoDate,
    };

    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save event");

      setMessage({
        text: editingId ? "Event updated successfully!" : "New event created successfully!",
        type: "success",
      });
      handleResetForm();
      await fetchEvents();
    } catch {
      setMessage({ text: "Error saving event. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
      setMessage({ text: "Event deleted successfully", type: "success" });
      await fetchEvents();
    } catch {
      setMessage({ text: "Error deleting event", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-[#06090c] text-white font-syne p-4 sm:p-8 md:p-12">
      {/* Header Bar */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-white/10">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Homepage
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            CTC Admin Dashboard
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono border border-emerald-500/30">
              Live Sync
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage upcoming events, modify countdown timers, and update homepage showcases dynamically.
          </p>
        </div>

        <button
          onClick={handleResetForm}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Event
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Editor */}
        <div className="lg:col-span-5 bg-[#0d1317] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl h-fit">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              {editingId ? "Edit Event & Timer" : "Create New Event"}
            </h2>
            {editingId && (
              <button
                onClick={handleResetForm}
                className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-mono mb-6 flex items-center gap-2 ${
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
              <label className="block text-xs font-mono text-gray-400 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. CodeStorm Hackathon 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Hackathon / Workshop"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Venue</label>
                <input
                  type="text"
                  value={form.venue || ""}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="Main Auditorium"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-emerald-400 mb-1 font-bold">
                Date & Time (Updates Homepage Countdown Timer!) *
              </label>
              <input
                type="datetime-local"
                required
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-emerald-500/40 text-emerald-300 text-sm focus:outline-none focus:border-emerald-400 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Image URL</label>
              <input
                type="text"
                value={form.image || ""}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="/assets/hero_3d.png"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Registration Link (CTA)</label>
              <input
                type="text"
                value={form.registerUrl || ""}
                onChange={(e) => setForm({ ...form, registerUrl: e.target.value })}
                placeholder="https://example.com/register"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief summary of the upcoming event..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : editingId ? "Update Event & Live Timer" : "Save Event"}
            </button>
          </form>
        </div>

        {/* Right Column: Events List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Configured Events ({events.length})</h2>
            <span className="text-xs font-mono text-gray-400">
              Next event will automatically display on Mac window showcase
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 font-mono text-sm">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-mono text-sm bg-[#0d1317] rounded-3xl border border-white/10">
              No events found. Create your first event using the form.
            </div>
          ) : (
            events.map((evt, idx) => (
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
                          {idx === 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                              Active Showcase Target
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
                          <span>{evt.venue}</span>
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
              )))}
        </div>
      </div>
    </div>
  );
}
