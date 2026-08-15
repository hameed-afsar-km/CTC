"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Pencil,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  ALL_JOIN_ROLES,
  JOIN_ROLE_DESCRIPTIONS,
  CUSTOM_ROLE_DESCRIPTION,
  JOIN_ROLES_DOC_ID,
  allRolesFor,
  displayJoinRole,
  normalizeCustomRole,
  roleDetailFor,
  type JoinRolesConfig,
  type RoleRules,
} from "@/lib/join-roles";
import { useAdmin } from "./admin-context";
import { PanelCard, PanelHeading, inputCls, labelCls } from "./ui";

interface EditModalState {
  roleId: string;
  isCustom: boolean;
  name: string;
  description: string;
  rules: string[];
  isOpen: boolean;
}

export default function JoinRolesPanel() {
  const { getToken } = useAdmin();
  const [config, setConfig] = useState<JoinRolesConfig | null>(null);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [deletedRoles, setDeletedRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(["member"]));
  const [details, setDetails] = useState<Record<string, RoleRules>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [editingRole, setEditingRole] = useState<string | null>(null);

  // Add role form state
  const [customInput, setCustomInput] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  // Modal edit state
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [modalRuleInput, setModalRuleInput] = useState("");
  const [modalRuleError, setModalRuleError] = useState<string | null>(null);

  // Delete confirm state
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<string | null>(null);

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
        const cfgDeleted = Array.isArray(data.config.deletedRoles) ? data.config.deletedRoles : [];
        const cfg: JoinRolesConfig = {
          id: JOIN_ROLES_DOC_ID,
          roles: Array.isArray(data.config.roles) ? data.config.roles : [],
          customRoles: Array.isArray(data.config.customRoles) ? data.config.customRoles : [],
          deletedRoles: cfgDeleted,
          roleDetails: data.config.roleDetails,
          roleLabels: data.config.roleLabels,
          updatedAt: data.config.updatedAt,
        };
        const detailMap: Record<string, RoleRules> = {};
        for (const r of allRolesFor(cfg)) {
          detailMap[r] = roleDetailFor(cfg, r);
        }
        setConfig(cfg);
        setCustomRoles(cfg.customRoles);
        setDeletedRoles(cfgDeleted);
        setSelected(new Set(cfg.roles));
        setDetails(detailMap);
        setLabels(cfg.roleLabels ?? {});
        const available = allRolesFor(cfg);
        setEditingRole((prev) => (prev && available.includes(prev) ? prev : available[0] ?? null));
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

  const saveConfigPayload = async (
    nextRoles: string[],
    nextCustom: string[],
    nextDeleted: string[],
    nextDetails: Record<string, RoleRules>,
    nextLabels: Record<string, string>
  ) => {
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
          roles: nextRoles,
          customRoles: nextCustom,
          deletedRoles: nextDeleted,
          roleDetails: nextDetails,
          roleLabels: nextLabels,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save join roles");
      }
      const cfg = data?.config;
      const openRoles = Array.isArray(cfg?.roles) ? cfg.roles : [];
      const cfgCustom = Array.isArray(cfg?.customRoles) ? cfg.customRoles : [];
      const cfgDeleted = Array.isArray(cfg?.deletedRoles) ? cfg.deletedRoles : [];
      const cfgDetails = (cfg?.roleDetails as Record<string, RoleRules>) ?? {};
      const cfgLabels = (cfg?.roleLabels as Record<string, string>) ?? {};

      const fullCfg: JoinRolesConfig = {
        id: JOIN_ROLES_DOC_ID,
        roles: openRoles,
        customRoles: cfgCustom,
        deletedRoles: cfgDeleted,
        roleDetails: cfgDetails,
        roleLabels: cfgLabels,
        updatedAt: cfg?.updatedAt,
      };

      const detailMap: Record<string, RoleRules> = {};
      for (const r of allRolesFor(fullCfg)) {
        detailMap[r] = cfgDetails[r] ?? roleDetailFor(fullCfg, r);
      }

      setConfig(fullCfg);
      setCustomRoles(cfgCustom);
      setDeletedRoles(cfgDeleted);
      setSelected(new Set(openRoles));
      setDetails(detailMap);
      setLabels(cfgLabels);
      setMessage({
        text: "Join roles configuration saved successfully.",
        type: "success",
      });
      return true;
    } catch (err) {
      setMessage({
        text: err instanceof Error && err.message ? err.message : "Error saving join roles.",
        type: "error",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggle = (role: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const addCustomRole = async () => {
    const rawName = customInput.trim();
    const normalized = normalizeCustomRole(rawName);
    if (!normalized) {
      setCustomError("Enter a role name first");
      return;
    }

    const nextDeleted = deletedRoles.filter((d) => normalizeCustomRole(d) !== normalized);
    const nextCustom = Array.from(new Set([...customRoles.filter((r) => r !== normalized), normalized]));
    const nextRoles = Array.from(new Set([...selected, normalized]));
    const nextDetails = {
      ...details,
      [normalized]: {
        description: customDescription.trim() || CUSTOM_ROLE_DESCRIPTION,
        rules: [],
      },
    };
    const nextLabels = {
      ...labels,
      [normalized]: rawName,
    };

    setDeletedRoles(nextDeleted);
    setCustomRoles(nextCustom);
    setSelected(new Set(nextRoles));
    setDetails(nextDetails);
    setLabels(nextLabels);
    setCustomInput("");
    setCustomDescription("");
    setCustomError(null);
    setEditingRole(normalized);

    await saveConfigPayload(nextRoles, nextCustom, nextDeleted, nextDetails, nextLabels);
  };

  // Open Edit Modal for any role
  const openEditModal = (role: string) => {
    const isCustom = customRoles.includes(role) || !ALL_JOIN_ROLES.includes(role);
    const roleRules = details[role]?.rules ?? [];
    const roleDesc = details[role]?.description ?? (JOIN_ROLE_DESCRIPTIONS[role] || "");
    const roleName = labels[role] || displayJoinRole(role);

    setEditModal({
      roleId: role,
      isCustom,
      name: roleName,
      description: roleDesc,
      rules: [...roleRules],
      isOpen: selected.has(role),
    });
    setModalRuleInput("");
    setModalRuleError(null);
  };

  // Save changes from Edit Modal
  const saveModalEdit = async () => {
    if (!editModal) return;
    const { roleId, name, description, rules, isOpen } = editModal;
    const trimmedName = name.trim();

    if (!trimmedName) {
      setModalRuleError("Role display name cannot be empty");
      return;
    }

    const nextLabels = {
      ...labels,
      [roleId]: trimmedName,
    };

    const nextDetails = {
      ...details,
      [roleId]: {
        description: description.trim(),
        rules: rules.filter((r) => r.trim().length > 0),
      },
    };

    const nextSelected = new Set(selected);
    if (isOpen) {
      nextSelected.add(roleId);
    } else {
      nextSelected.delete(roleId);
    }

    const nextRoles = Array.from(nextSelected);

    setLabels(nextLabels);
    setDetails(nextDetails);
    setSelected(nextSelected);

    const ok = await saveConfigPayload(nextRoles, customRoles, deletedRoles, nextDetails, nextLabels);
    if (ok) {
      setEditModal(null);
    }
  };

  // Delete a role (removes it completely from active join roles)
  const deleteRole = async (role: string) => {
    const roleNorm = normalizeCustomRole(role);
    const nextDeleted = Array.from(new Set([...deletedRoles, roleNorm]));
    const nextCustom = customRoles.filter((r) => normalizeCustomRole(r) !== roleNorm);
    const nextSelected = new Set(selected);
    nextSelected.delete(role);
    const nextRoles = Array.from(nextSelected).filter((r) => normalizeCustomRole(r) !== roleNorm);

    const nextDetails = { ...details };
    delete nextDetails[role];

    const nextLabels = { ...labels };
    delete nextLabels[role];

    setDeletedRoles(nextDeleted);
    setCustomRoles(nextCustom);
    setSelected(new Set(nextRoles));
    setDetails(nextDetails);
    setLabels(nextLabels);
    if (editingRole === role) {
      const remaining = allRolesFor({
        id: JOIN_ROLES_DOC_ID,
        roles: nextRoles,
        customRoles: nextCustom,
        deletedRoles: nextDeleted,
      });
      setEditingRole(remaining[0] ?? null);
    }
    setDeleteConfirmRole(null);

    await saveConfigPayload(nextRoles, nextCustom, nextDeleted, nextDetails, nextLabels);
  };

  // Restore Default Roles
  const restoreDefaultRoles = async () => {
    if (!window.confirm("Restore all core default roles (Tech, Media, Review, Admin, Member)?")) return;
    const nextDeleted: string[] = [];
    const nextRoles = Array.from(new Set([...selected, "member"]));
    setDeletedRoles(nextDeleted);
    setSelected(new Set(nextRoles));
    await saveConfigPayload(nextRoles, customRoles, nextDeleted, details, labels);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0 && !window.confirm("Close all roles? The join form will default back to Member.")) {
      return;
    }
    await saveConfigPayload(Array.from(selected), customRoles, deletedRoles, details, labels);
  };

  const roleList = allRolesFor({
    id: JOIN_ROLES_DOC_ID,
    roles: selected.size ? Array.from(selected) : [],
    customRoles,
    deletedRoles,
  });

  const previewRoles = Array.from(selected).filter((r) => roleList.includes(r));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        <PanelCard>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <PanelHeading
              title="Open Join Roles"
              subtitle="Manage, edit, or delete the roles applicants can select in the Join Form."
              action={<BadgeCheck className="w-5 h-5 text-emerald-400" />}
            />
            {deletedRoles.length > 0 && (
              <button
                type="button"
                onClick={restoreDefaultRoles}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
                title="Restore default core roles"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                Restore Defaults
              </button>
            )}
          </div>

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
              Loading roles...
            </div>
          ) : (
            <form onSubmit={handleSaveAll} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={labelCls}>Available roles</span>
                  <span className="text-[11px] font-mono text-gray-400">
                    {selected.size} of {roleList.length} open
                  </span>
                </div>

                {roleList.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-white/10 bg-black/30 space-y-2">
                    <p className="text-xs font-mono text-gray-400">
                      No roles currently available. Add a new role below or restore defaults.
                    </p>
                    <button
                      type="button"
                      onClick={restoreDefaultRoles}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Default Roles
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {roleList.map((role) => {
                      const checked = selected.has(role);
                      const isCustom = customRoles.includes(role) || !ALL_JOIN_ROLES.includes(role);
                      const displayName = labels[role] || displayJoinRole(role);
                      const ruleCount = (details[role]?.rules ?? []).length;
                      const desc =
                        details[role]?.description ||
                        (isCustom ? CUSTOM_ROLE_DESCRIPTION : JOIN_ROLE_DESCRIPTIONS[role]);

                      return (
                        <div
                          key={role}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                            checked
                              ? "bg-emerald-500/10 border-emerald-500/35 shadow-[0_0_20px_rgba(52,211,153,0.08)]"
                              : "bg-black/30 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {/* Left: Role Info & Selection Toggle */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggle(role)}
                              aria-pressed={checked}
                              className="mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer"
                            >
                              <span
                                className={`w-full h-full rounded-md flex items-center justify-center ${
                                  checked
                                    ? "bg-emerald-400 border-emerald-400 text-black"
                                    : "bg-black/40 border-white/20 hover:border-white/40"
                                }`}
                              >
                                {checked && <CheckCircle className="w-3.5 h-3.5" />}
                              </span>
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-white truncate">
                                  {displayName}
                                </h3>
                                {isCustom ? (
                                  <span className="inline-flex items-center rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-indigo-300">
                                    Custom Role
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-gray-400">
                                    Core Role
                                  </span>
                                )}
                                {ruleCount > 0 && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-300">
                                    {ruleCount} rule{ruleCount === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                                {desc}
                              </p>
                            </div>
                          </div>

                          {/* Right: Actions (Enable/Disable, Edit, Delete) */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => toggle(role)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all ${
                                checked
                                  ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-300"
                                  : "bg-white/5 hover:bg-white/10 border-white/15 text-gray-400 hover:text-white"
                              }`}
                              title={checked ? "Click to disable this role for applicants" : "Click to enable this role for applicants"}
                            >
                              {checked ? "Enabled" : "Disabled"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold uppercase tracking-wider transition-all"
                              title={`Edit ${displayName}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteConfirmRole(role)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all"
                              title={`Delete ${displayName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Role Card */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Add New Role
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Role Name *</label>
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => {
                        setCustomInput(e.target.value);
                        setCustomError(null);
                      }}
                      placeholder="e.g. Public Relations, Event Operations, Designer..."
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Description (optional)</label>
                    <textarea
                      rows={2}
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Describe what applicants for this role will be doing..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  {customError && (
                    <p className="text-xs font-mono text-red-400">{customError}</p>
                  )}

                  <button
                    type="button"
                    onClick={addCustomRole}
                    disabled={saving || !customInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Create Role
                  </button>
                </div>
              </div>

              {/* Master Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_24px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Open Join Roles
                  </>
                )}
              </button>
            </form>
          )}
        </PanelCard>
      </div>

      {/* Right Column: Live Form Preview & Information */}
      <div className="lg:col-span-5 space-y-5">
        <PanelCard>
          <PanelHeading
            title="Live Join Form Preview"
            subtitle="How roles and guidelines appear to students."
          />

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2.5">
                Open Roles for Applicants
              </p>
              <div className="flex flex-wrap gap-2">
                {previewRoles.length > 0 ? (
                  previewRoles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-emerald-500/15 border border-emerald-500/35 px-3 py-1 text-xs font-mono font-bold text-emerald-300"
                    >
                      {labels[r] || displayJoinRole(r)}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-mono text-gray-400">
                    Member (fallback)
                  </span>
                )}
              </div>
            </div>

            {editingRole && details[editingRole] && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                    Role Guidelines · {labels[editingRole] || displayJoinRole(editingRole)}
                  </p>
                  <button
                    type="button"
                    onClick={() => openEditModal(editingRole)}
                    className="text-[10px] font-mono text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit Details
                  </button>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  {details[editingRole]?.description?.trim() ||
                    JOIN_ROLE_DESCRIPTIONS[editingRole] ||
                    "No description set."}
                </p>

                {(details[editingRole]?.rules ?? []).length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {(details[editingRole]?.rules ?? []).map((rule, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed"
                      >
                        <ListChecks className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        {rule || <span className="text-gray-600">Empty rule</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-4">
            <p>
              • Applicants pick one of the active open roles when applying. When an application is
              approved, that role is automatically granted to the member&apos;s digital ID card.
            </p>
            <p>
              • You can edit role titles, descriptions, and custom acceptance rules anytime by
              clicking the <span className="text-sky-300 font-bold">Edit</span> button.
            </p>
            <p>
              • Deleting a role removes it completely from the list of available join roles.
            </p>
            <p className="text-[11px] font-mono text-gray-500">
              Last saved: {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : "—"}
            </p>
          </div>
        </PanelCard>
      </div>

      {/* EDIT ROLE MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="absolute inset-0" onClick={() => setEditModal(null)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-[#0d1317] shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Edit Role: {editModal.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {editModal.roleId} • {editModal.isCustom ? "Custom Role" : "Core Role"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className={labelCls}>Role Display Name *</label>
                <input
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  placeholder="Role title"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Role Description</label>
                <textarea
                  rows={3}
                  value={editModal.description}
                  onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                  placeholder="Describe what this role involves for applicants..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Acceptance Rules &amp; Guidelines</label>
                  <span className="text-[10px] font-mono text-gray-400">
                    Applicants must accept these rules
                  </span>
                </div>

                <div className="space-y-2">
                  {editModal.rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => {
                          const updated = [...editModal.rules];
                          updated[i] = e.target.value;
                          setEditModal({ ...editModal, rules: updated });
                        }}
                        className={inputCls}
                        placeholder={`Rule #${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editModal.rules.filter((_, idx) => idx !== i);
                          setEditModal({ ...editModal, rules: updated });
                        }}
                        className="shrink-0 w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center justify-center transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add rule inline */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={modalRuleInput}
                    onChange={(e) => {
                      setModalRuleInput(e.target.value);
                      setModalRuleError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (modalRuleInput.trim()) {
                          setEditModal({
                            ...editModal,
                            rules: [...editModal.rules, modalRuleInput.trim()],
                          });
                          setModalRuleInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Must attend weekly tech syncs..."
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (modalRuleInput.trim()) {
                        setEditModal({
                          ...editModal,
                          rules: [...editModal.rules, modalRuleInput.trim()],
                        });
                        setModalRuleInput("");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </button>
                </div>
                {modalRuleError && (
                  <p className="mt-1.5 text-xs font-mono text-red-400">{modalRuleError}</p>
                )}
              </div>

              {/* Status toggle inside modal */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Open for Applications</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Allow applicants to choose this role on the Join page
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModal({ ...editModal, isOpen: !editModal.isOpen })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    editModal.isOpen ? "bg-emerald-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      editModal.isOpen ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 pt-4 border-t border-white/10 bg-black/20">
              <button
                type="button"
                onClick={() => {
                  const r = editModal.roleId;
                  setEditModal(null);
                  setDeleteConfirmRole(r);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all"
                title={`Delete ${editModal.name}`}
              >
                <Trash2 className="w-4 h-4" />
                Delete Role
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveModalEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmRole(null)} />
          <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#140a0c] shadow-[0_20px_80px_rgba(0,0,0,0.9)] p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Role?</h3>
                <p className="text-xs text-rose-300/80 font-mono">
                  {labels[deleteConfirmRole] || displayJoinRole(deleteConfirmRole)}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to delete the role &quot;{labels[deleteConfirmRole] || displayJoinRole(deleteConfirmRole)}&quot;?
              It will be removed from available roles on the Join form and deleted immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRole(null)}
                className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteRole(deleteConfirmRole)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
