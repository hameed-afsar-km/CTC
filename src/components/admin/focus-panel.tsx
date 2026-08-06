"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Crosshair, Loader2, Save } from "lucide-react";
import type { FocusConfig } from "@/lib/focus";
import { useAdmin } from "./admin-context";
import { PanelCard, PanelHeading, inputCls, labelCls } from "./ui";

export default function FocusPanel() {
  const { getToken } = useAdmin();
  const [config, setConfig] = useState<FocusConfig | null>(null);
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/focus", { cache: "no-store", headers });
      const data = await res.json().catch(() => null);
      if (data?.config && typeof data.config.text === "string") {
        setConfig(data.config);
        setText(data.config.text);
        setEnabled(Boolean(data.config.enabled));
      }
    } catch {
      setMessage({ text: "Failed to load focus config", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const t = setTimeout(fetchConfig, 0);
    return () => clearTimeout(t);
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setMessage({ text: "Focus text is required", type: "error" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken().catch(() => null);
      const res = await fetch("/api/admin/focus", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: text.trim(), enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save focus config");
      }
      setConfig(data?.config ?? null);
      setMessage({
        text: enabled ? "Focus ticker is now live on the homepage." : "Focus ticker saved (disabled).",
        type: "success",
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error && err.message ? err.message : "Error saving focus config.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6">
        <PanelCard>
          <PanelHeading
            title="Currently Focusing Ticker"
            subtitle="A scrolling announcement pinned to the top of the homepage."
            action={<Crosshair className="w-5 h-5 text-emerald-400" />}
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

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs font-mono text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className={labelCls}>Focus text *</label>
                <textarea
                  rows={3}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Focused on WebForge Workshop — registrations open!"
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-1.5 text-[10px] font-mono text-gray-500">
                  {text.trim().length} characters
                </p>
              </div>

              <div>
                <span className={labelCls}>Status</span>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {enabled ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                      {enabled
                        ? "The ticker is visible at the top of the homepage."
                        : "The ticker is hidden on the homepage."}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => setEnabled((prev) => !prev)}
                    className="relative shrink-0 rounded-full overflow-hidden transition-colors duration-300"
                    style={{
                      width: 52,
                      height: 28,
                      backgroundColor: enabled ? "#34d399" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    <span
                      className="absolute block rounded-full bg-white shadow transition-transform duration-300"
                      style={{
                        width: 24,
                        height: 24,
                        top: 2,
                        left: 2,
                        transform: enabled ? "translateX(24px)" : "translateX(0px)",
                      }}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : enabled ? "Update & Enable Ticker" : "Save Ticker"}
              </button>
            </form>
          )}
        </PanelCard>
      </div>

      <div className="lg:col-span-6">
        <PanelCard>
          <PanelHeading
            title="Live Preview"
            subtitle="Exactly how the ticker appears at the top of the homepage."
          />
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div
              className="flex items-center h-9 border-b border-white/10 px-3 bg-black/40"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(52,211,153,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,211,153,0.05) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500">
                Preview
              </span>
            </div>
            <div className="relative h-12 overflow-hidden bg-[#040706] border-b border-emerald-500/20 flex items-center">
              {enabled && text.trim() ? (
                <div className="flex items-center w-full overflow-hidden">
                  <div className="animate-marquee items-center" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span
                        key={i}
                        className="flex items-center whitespace-nowrap px-4 text-sm font-syne font-bold uppercase tracking-wider text-emerald-300"
                      >
                        <span className="text-emerald-400 mr-3">✦</span>
                        {text.trim()}
                        <span className="text-emerald-400 ml-3">✦</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="w-full text-center text-xs font-mono text-gray-600">
                  {enabled ? "Add some focus text to preview" : "Ticker is disabled"}
                </p>
              )}
            </div>
            <div className="px-3 py-2 flex items-center justify-between bg-black/40">
              <span className="text-[10px] font-mono text-gray-500">
                Last updated: {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : "—"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest ${
                  enabled
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-white/5 text-gray-400 border-white/15"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {enabled ? "Live" : "Off"}
              </span>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
