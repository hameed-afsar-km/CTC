"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  ALL_JOIN_ROLES,
  JOIN_ROLE_DESCRIPTIONS,
  CUSTOM_ROLE_DESCRIPTION,
  JOIN_ROLES_DOC_ID,
  allRolesFor,
  displayJoinRole,
  normalizeCustomRole,
  type JoinRolesConfig,
} from "@/lib/join-roles";
import { useAdmin } from "./admin-context";
import { PanelCard, PanelHeading, inputCls, labelCls } from "./ui";

export default function JoinRolesPanel() {
  const { getToken } = useAdmin();
  const [config, setConfig] = useState<JoinRolesConfig | null>(null);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(["member"]));
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/join-roles", { cache: "no-store", headers });
      const data = await res.json().catch(() => null);
      if (data?.config) {
        const cfg: JoinRolesConfig = {
          id: JOIN_ROLES_DOC_ID,
          roles: Array.isArray(data.config.roles) ? data.config.roles : [],
          customRoles: Array.isArray(data.config.customRoles) ? data.config.customRoles : [],
          updatedAt: data.config.updatedAt,
        };
        setConfig(cfg);
        setCustomRoles(cfg.customRoles);
        setSelected(new Set(cfg.roles));
      }
    } catch {
      setMessage({ text: "Failed to load join roles", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const t = setTimeout(fetchConfig, 0);
    return () => clearTimeout(t);
  }, [fetchConfig]);

  const toggle = (role: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const addCustomRole = () => {
    const normalized = normalizeCustomRole(customInput);
    if (!normalized) {
      setCustomError("Enter a role name first");
      return;
    }
    if (ALL_JOIN_ROLES.includes(normalized)) {
      setCustomError("That role already exists in the built-in list");
      return;
    }
    if (customRoles.includes(normalized)) {
      setCustomError("That custom role already exists");
      return;
    }
    setCustomRoles((prev) => [...prev, normalized]);
    setSelected((prev) => new Set(prev).add(normalized));
    setCustomInput("");
    setCustomError(null);
    setMessage(null);
  };

  const removeCustomRole = (role: string) => {
    setCustomRoles((prev) => prev.filter((r) => r !== role));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(role);
      return next;
    });
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0 && !window.confirm("Close all roles? The join form will default back to Member.")) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken().catch(() => null);
      const res = await fetch("/api/admin/join-roles", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          roles: Array.from(selected),
          customRoles,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save join roles");
      }
      const cfg = data?.config;
      const openRoles = Array.isArray(cfg?.roles) ? cfg.roles : [];
      const cfgCustom = Array.isArray(cfg?.customRoles) ? cfg.customRoles : [];
      setConfig({
        id: JOIN_ROLES_DOC_ID,
        roles: openRoles,
        customRoles: cfgCustom,
        updatedAt: cfg?.updatedAt,
      });
      setCustomRoles(cfgCustom);
      setSelected(new Set(openRoles));
      setMessage({
        text: openRoles.length
          ? `Roles open for joining: ${openRoles.map(displayJoinRole).join(", ")}.`
          : "All roles are closed. The join form will default back to Member.",
        type: "success",
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error && err.message ? err.message : "Error saving join roles.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const roleList = allRolesFor({
    id: JOIN_ROLES_DOC_ID,
    roles: selected.size ? Array.from(selected) : [],
    customRoles,
  });

  const previewRoles = selected.size > 0 ? Array.from(selected) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7">
        <PanelCard>
          <PanelHeading
            title="Open Join Roles"
            subtitle="Tick the roles applicants may choose in the Join form. Add custom roles below. The Member role is always available as a fallback."
            action={<BadgeCheck className="w-5 h-5 text-emerald-400" />}
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
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <span className={labelCls}>Available roles</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleList.map((role) => {
                    const checked = selected.has(role);
                    const isMember = role === "member";
                    const isCustom = customRoles.includes(role);
                    return (
                      <div
                        key={role}
                        className={`text-left flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                          checked
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_16px_rgba(52,211,153,0.12)]"
                            : "bg-black/30 border-white/10 hover:border-white/25"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(role)}
                          aria-pressed={checked}
                          className="flex items-start gap-3 flex-1 min-w-0"
                        >
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              checked ? "bg-emerald-400 border-emerald-400 text-black" : "bg-black/40 border-white/20"
                            }`}
                          >
                            {checked && <CheckCircle className="w-3.5 h-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-white">
                              {displayJoinRole(role)}
                              {isCustom && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-indigo-300">
                                  custom
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] font-mono text-gray-500 mt-0.5 leading-relaxed">
                              {isMember
                                ? "Always shown when no other role is selected."
                                : isCustom
                                  ? CUSTOM_ROLE_DESCRIPTION
                                  : JOIN_ROLE_DESCRIPTIONS[role]}
                            </span>
                          </span>
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => removeCustomRole(role)}
                            title={`Remove ${displayJoinRole(role)}`}
                            className="shrink-0 w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] font-mono text-gray-500">
                  {selected.size} of {roleList.length} roles currently open.
                </p>
              </div>

              <div>
                <span className={labelCls}>Add a custom role</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => {
                      setCustomInput(e.target.value);
                      setCustomError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomRole();
                      }
                    }}
                    placeholder="e.g. Public Relations, Sponsorship..."
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addCustomRole}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {customError && <p className="mt-1.5 text-xs font-mono text-red-400">{customError}</p>}
                {customRoles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customRoles.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-mono text-indigo-300"
                      >
                        {displayJoinRole(r)}
                        <button
                          type="button"
                          onClick={() => removeCustomRole(r)}
                          className="text-indigo-300/60 hover:text-white transition-colors"
                          aria-label={`Remove ${displayJoinRole(r)}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] font-mono text-gray-500">
                  Custom roles apply to anyone you approve. You can also grant them directly in{" "}
                  <span className="text-gray-300">Users &amp; Roles</span>.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Join Roles"}
              </button>
            </form>
          )}
        </PanelCard>
      </div>

      <div className="lg:col-span-5">
        <PanelCard>
          <PanelHeading
            title="How it works"
            subtitle="What applicants see in the Join form."
          />
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                Role applying for
              </p>
              <div className="flex flex-wrap gap-2">
                {previewRoles.length > 0 ? (
                  previewRoles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-mono text-emerald-300"
                    >
                      {displayJoinRole(r)}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-mono text-gray-400">
                    Member (fallback)
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Applicants pick one of the open roles when submitting the join form. When an
              application is approved, that role is granted to the applicant&apos;s user record.
              Rejecting keeps any existing team roles untouched.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed font-mono">
              Last updated: {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : "—"}
            </p>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
