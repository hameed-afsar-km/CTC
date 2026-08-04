"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import type { GalleryItem } from "@/lib/gallery-store";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";

export default function GalleryPanel() {
  const { getToken } = useAdmin();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    file: null as File | null,
    title: "",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/gallery", {
        cache: "no-store",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setItems(data.items);
          return;
        }
      }

      // Public fallback
      const pubRes = await fetch("/api/gallery", { cache: "no-store" });
      const pubData = await pubRes.json();
      if (Array.isArray(pubData.items)) {
        setItems(pubData.items);
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

  const handleFile = (file: File | null) => {
    setForm((prev) => ({ ...prev, file }));
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) {
      setMessage({ text: "Please choose an image file", type: "error" });
      return;
    }
    if (!form.title.trim()) {
      setMessage({ text: "Title is required", type: "error" });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const token = await getToken().catch(() => null);
      let imageUrl = "";

      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const formData = new FormData();
        formData.append("file", form.file);
        const uploadRes = await fetch("/api/admin/gallery/upload", {
          method: "POST",
          headers,
          body: formData,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json().catch(() => null);
          if (data?.imageUrl) imageUrl = data.imageUrl;
        }
      } catch {
        // Fallback to Data URL
      }

      if (!imageUrl) {
        imageUrl = await fileToDataUrl(form.file);
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const metaRes = await fetch("/api/admin/gallery", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          imageUrl,
          title: form.title,
          category: form.category || "General",
          description: form.description || "",
          date: form.date,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!metaRes.ok) {
        const errData = await metaRes.json().catch(() => null);
        throw new Error(errData?.error ?? "Failed to save gallery item");
      }

      setMessage({ text: "Photo uploaded to the gallery!", type: "success" });
      setForm({ file: null, title: "", category: "", description: "", date: new Date().toISOString().slice(0, 10) });
      setPreview(null);
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Upload failed",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Upload form */}
      <div className="lg:col-span-4">
        <PanelCard>
          <PanelHeading
            title="Upload Photo"
            subtitle="Add a moment to the homepage gallery."
            action={<ImagePlus className="w-5 h-5 text-emerald-400" />}
          />

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

          <form onSubmit={handleUpload} className="space-y-4">
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-400/50 transition-colors p-6 bg-black/30">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-40 rounded-xl object-cover" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-emerald-400" />
                )}
                <span className="text-xs font-mono text-gray-400">
                  {preview ? "Tap to change image" : "Choose image file (max 15MB)"}
                </span>
              </div>
            </label>

            <div>
              <label className={labelCls}>Title *</label>
              <input
                type="text"
                required
                value={form.title}
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
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Hackathon"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={`${inputCls} [&::-webkit-calendar-picker-indicator]:opacity-60`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's happening in this photo?"
                className={`${inputCls} resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="w-4 h-4" />
                  Upload to Gallery
                </>
              )}
            </button>
          </form>
        </PanelCard>
      </div>

      {/* Items grid */}
      <div className="lg:col-span-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Gallery Photos ({items.length})</h2>
          <p className="text-xs text-gray-400 mt-1">
            These appear on the homepage gallery section.
          </p>
        </div>

        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <PanelCard>
            <EmptyState message="No photos yet. Upload your first image using the form." />
          </PanelCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#0d1317]"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title || "Gallery photo"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300" />
                <div className="absolute inset-x-0 bottom-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  {item.title && (
                    <div className="text-sm font-bold text-white truncate">{item.title}</div>
                  )}
                  {item.category && (
                    <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider mt-0.5">
                      {item.category}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
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
    </div>
  );
}
