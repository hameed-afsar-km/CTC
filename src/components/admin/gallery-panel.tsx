"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  FolderPlus,
  Images,
  Trash2,
  UploadCloud,
  Pencil,
  Save,
  Search,
  X,
  Loader2,
} from "lucide-react";
import type { GalleryItem } from "@/lib/gallery-store";
import type { GalleryEventFolder } from "@/lib/gallery-events-store";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getClientApp } from "@/lib/firebase-client";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function GalleryPanel() {
  const { getToken } = useAdmin();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [events, setEvents] = useState<GalleryEventFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [labelTarget, setLabelTarget] = useState<GalleryItem | null>(null);
  const [labelValue, setLabelValue] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);

  const [eventForm, setEventForm] = useState({
    name: "",
    category: "",
    description: "",
    date: today(),
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [itemsRes, eventsRes] = await Promise.all([
        fetch("/api/admin/gallery", { cache: "no-store", headers }),
        fetch("/api/admin/gallery/events", { cache: "no-store", headers }),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        if (Array.isArray(data.items)) setItems(data.items);
      } else {
        const pubRes = await fetch("/api/gallery", { cache: "no-store" });
        const pubData = await pubRes.json();
        if (Array.isArray(pubData.items)) setItems(pubData.items);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        if (Array.isArray(data.events)) setEvents(data.events);
      }
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

  const itemsByEventId = useMemo(() => {
    const map = new Map<string, GalleryItem[]>();
    for (const it of items) {
      if (!it.eventId) continue;
      const arr = map.get(it.eventId) ?? [];
      arr.push(it);
      map.set(it.eventId, arr);
    }
    return map;
  }, [items]);

  const uncategorized = useMemo(() => items.filter((it) => !it.eventId), [items]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const currentItems = useMemo(
    () => (selectedEvent ? itemsByEventId.get(selectedEvent.id) ?? [] : uncategorized),
    [selectedEvent, itemsByEventId, uncategorized]
  );

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name.trim()) {
      setMessage({ text: "Event name is required", type: "error" });
      return;
    }
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const payload = {
        id,
        name: eventForm.name.trim(),
        category: eventForm.category.trim(),
        description: eventForm.description.trim(),
        date: eventForm.date,
        createdAt: new Date().toISOString(),
      };
      const res = await fetch("/api/admin/gallery/events", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create event folder");

      setEventForm({ name: "", category: "", description: "", date: today() });
      setSelectedEventId(id);
      await fetchAll();
      setMessage({ text: `Event folder "${payload.name}" created! Now drop photos into it.`, type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create event folder",
        type: "error",
      });
    }
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setMessage({ text: "Please choose image files", type: "error" });
      return;
    }
    if (files.some((f) => f.size > 15 * 1024 * 1024)) {
      setMessage({ text: "Some files exceed the 15MB limit", type: "error" });
      return;
    }

    const folderName = selectedEvent ? selectedEvent.name : "General";
    setUploading(true);
    setMessage(null);
    setUploadProgress({ done: 0, total: files.length });
    let success = 0;
    let failed = 0;
    try {
      const token = await getToken().catch(() => null);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          let imageUrl = "";
          try {
            const formData = new FormData();
            formData.append("file", file);
            const uploadHeaders: Record<string, string> = {};
            if (token) uploadHeaders["Authorization"] = `Bearer ${token}`;
            const uploadRes = await fetch("/api/admin/gallery/upload", {
              method: "POST",
              headers: uploadHeaders,
              body: formData,
            });
            if (uploadRes.ok) {
              const data = await uploadRes.json().catch(() => null);
              if (data?.imageUrl) imageUrl = data.imageUrl;
            }
          } catch {
            // Fallback to Data URL
          }
          if (!imageUrl) imageUrl = await fileToDataUrl(file);

          const itemId = `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const itemPayload = {
            id: itemId,
            imageUrl,
            title: folderName,
            category: selectedEvent?.category || "General",
            description: selectedEvent?.description || "",
            date: selectedEvent?.date || today(),
            createdAt: new Date().toISOString(),
            eventId: selectedEvent?.id,
          };

          const metaHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (token) metaHeaders["Authorization"] = `Bearer ${token}`;
          const metaRes = await fetch("/api/admin/gallery", {
            method: "POST",
            headers: metaHeaders,
            body: JSON.stringify(itemPayload),
          });
          if (!metaRes.ok) {
            try {
              const db = getFirestore(getClientApp());
              await setDoc(doc(db, "gallery", itemId), itemPayload, { merge: true });
            } catch {
              throw new Error("Failed to save gallery item");
            }
          }
          success++;
        } catch {
          failed++;
        }
        setUploadProgress({ done: i + 1, total: files.length });
      }
      setMessage({
        text:
          failed === 0
            ? `Uploaded ${success} photo${success === 1 ? "" : "s"} to "${folderName}"!`
            : `Uploaded ${success}, ${failed} failed.`,
        type: failed === 0 ? "success" : "error",
      });
      await fetchAll();
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this photo from the gallery?")) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchAll();
    } catch {
      // ignore
    }
  };

  const handleDeleteEvent = async (folder: GalleryEventFolder) => {
    if (!confirm(`Delete the "${folder.name}" folder and all its photos?`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/gallery/events?id=${encodeURIComponent(folder.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete folder");
      if (selectedEventId === folder.id) setSelectedEventId(null);
      await fetchAll();
      setMessage({ text: `Folder "${folder.name}" deleted.`, type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to delete folder",
        type: "error",
      });
    }
  };

  const folderLabel = selectedEvent ? selectedEvent.name : "General";
  const folderThumb = (folder: GalleryEventFolder) => itemsByEventId.get(folder.id)?.[0];

  const filteredCurrent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentItems;
    return currentItems.filter((it) =>
      [it.label, it.title, it.category, it.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [currentItems, searchQuery]);

  const openLabelEditor = (item: GalleryItem) => {
    setLabelTarget(item);
    setLabelValue(item.label ?? "");
    setLabelSaving(false);
  };

  const saveLabel = async () => {
    if (!labelTarget) return;
    setLabelSaving(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/gallery?id=${encodeURIComponent(labelTarget.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ label: labelValue.trim() }),
      });
      if (!res.ok) {
        const db = getFirestore(getClientApp());
        await setDoc(doc(db, "gallery", labelTarget.id), { label: labelValue.trim() }, { merge: true });
      }
      setMessage({ text: "Photo label updated.", type: "success" });
      setLabelTarget(null);
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update label",
        type: "error",
      });
    } finally {
      setLabelSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: create folder + folder list */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <PanelCard>
          <PanelHeading
            title="Create Event Folder"
            subtitle="Group photos under an event name."
            action={<FolderPlus className="w-5 h-5 text-emerald-400" />}
          />
          <form onSubmit={createEvent} className="space-y-4">
            <div>
              <label className={labelCls}>Event Name *</label>
              <input
                type="text"
                required
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="e.g. CodeStorm Hackathon 2026"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Category</label>
                <input
                  type="text"
                  value={eventForm.category}
                  onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                  placeholder="Hackathon"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className={`${inputCls} [&::-webkit-calendar-picker-indicator]:opacity-60`}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={2}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="What happened at this event?"
                className={`${inputCls} resize-none`}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Create Folder
            </button>
          </form>
        </PanelCard>

        <PanelCard>
          <PanelHeading
            title="Event Folders"
            subtitle={`${events.length} folder${events.length === 1 ? "" : "s"} · select one to manage its photos.`}
            action={<Folder className="w-5 h-5 text-emerald-400" />}
          />
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setSelectedEventId(null)}
              className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                selectedEventId === null
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : "border-white/10 bg-black/20 hover:border-white/20"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                <Images className="w-5 h-5 text-gray-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">General</div>
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  {uncategorized.length} photo{uncategorized.length === 1 ? "" : "s"} · no folder
                </div>
              </div>
            </button>

            {events.map((folder) => {
              const count = itemsByEventId.get(folder.id)?.length ?? 0;
              const thumb = folderThumb(folder);
              return (
                <div
                  key={folder.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                    selectedEventId === folder.id
                      ? "border-emerald-400/50 bg-emerald-500/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(folder.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {thumb ? (
                        <img src={thumb.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Folder className="w-5 h-5 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{folder.name}</div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        {count} photo{count === 1 ? "" : "s"}
                        {folder.category ? ` · ${folder.category}` : ""}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(folder)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 text-rose-300/70 hover:bg-rose-500/30 hover:text-rose-200 transition-colors"
                    title={`Delete ${folder.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </div>

      {/* Right: folder detail + uploads */}
      <div className="lg:col-span-8">
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                {folderLabel} ({filteredCurrent.length})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {selectedEvent
                  ? `Manage photos for ${selectedEvent.name}${selectedEvent.date ? ` · ${selectedEvent.date}` : ""}.`
                  : "Photos without an event folder. Create a folder and upload into it to organize the gallery."}
              </p>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photos by label, title, category..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-mono mb-4 ${
              message.type === "success"
                ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-400"
                : "bg-red-950/60 border border-red-500/40 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <PanelCard className="mb-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!uploading && e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-white/15 bg-black/30 hover:border-emerald-400/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <UploadCloud className={`w-10 h-10 ${dragOver ? "text-emerald-300" : "text-emerald-400"}`} />
            <div className="text-center">
              <p className="text-sm font-bold text-white">
                {uploading ? "Uploading…" : `Drag & drop photos into "${folderLabel}"`}
              </p>
              <p className="mt-1 text-[11px] font-mono text-gray-400">
                or{" "}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-emerald-400 underline decoration-dotted hover:text-emerald-300 disabled:opacity-50"
                >
                  browse files
                </button>{" "}
                — multiple files supported (max 15MB each)
              </p>
            </div>
            {uploadProgress && (
              <div className="w-full max-w-xs mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-200"
                    style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-400">
                  {uploadProgress.done}/{uploadProgress.total}
                </span>
              </div>
            )}
          </div>
        </PanelCard>

        {loading ? (
          <LoadingState />
        ) : filteredCurrent.length === 0 ? (
          <PanelCard>
            {searchQuery.trim() ? (
              <EmptyState message="No photos match your search in this folder." />
            ) : (
              <EmptyState
                message={
                  selectedEvent
                    ? `No photos in "${selectedEvent.name}" yet. Drop some images above.`
                    : "No photos here yet. Drop some images above to get started."
                }
              />
            )}
          </PanelCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredCurrent.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#0d1317]"
              >
                <img
                  src={item.imageUrl}
                  alt={item.label || item.title || "Gallery photo"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300" />
                <div className="absolute inset-x-0 bottom-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  {item.label && (
                    <div className="text-sm font-bold text-white truncate">{item.label}</div>
                  )}
                  {item.title && (
                    <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider mt-0.5 truncate">
                      {item.title}
                    </div>
                  )}
                  {item.category && (
                    <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider truncate">
                      {item.category}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openLabelEditor(item)}
                  className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  title="Edit label"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-rose-300 hover:bg-rose-500/30 transition-colors"
                  title="Delete photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Label edit modal */}
      {labelTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!labelSaving) setLabelTarget(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0d1317] shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="p-6 pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Edit Photo Label</h3>
              <p className="mt-1 text-xs text-gray-400">
                Caption shown under this photo on the gallery page and used in image search.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={labelTarget.imageUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{labelTarget.title}</div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">
                    {labelTarget.category || "No category"}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Label / Caption</label>
                <input
                  type="text"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  placeholder="e.g. Winners of the coding round"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-0">
              <button
                onClick={() => setLabelTarget(null)}
                disabled={labelSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={saveLabel}
                disabled={labelSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60"
              >
                {labelSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {labelSaving ? "Saving..." : "Save Label"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
