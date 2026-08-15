"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, X, Shield, Trash2, Loader2, Pencil, Save, RotateCcw, QrCode, ShieldCheck } from "lucide-react";
import type { SiteUser } from "@/lib/users-store";
import { useAdmin } from "./admin-context";
import { ADMIN_ROLES, ROLE_LABELS, ROLE_BADGE, ALL_SCOPES, SCOPE_LABELS, hasScope } from "@/lib/roles";
import type { AdminRole, AdminScope, ScopePermissions } from "@/lib/roles";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";
import MemberCard from "@/components/MemberCard";

interface MemberCodeInfo {
  code: string;
  name: string;
  roles: string[];
  version: number;
  issuedAt: string | null;
}

const ROLE_SET = new Set<string>(ADMIN_ROLES);

function adminRoleOf(user: SiteUser): AdminRole | null {
  for (const role of ADMIN_ROLES) {
    if (user.roles.includes(role)) return role;
  }
  return null;
}

function otherRolesOf(user: SiteUser): string[] {
  return user.roles.filter((r) => !ROLE_SET.has(r));
}

export default function UsersPanel() {
  const { getToken } = useAdmin();
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [newUser, setNewUser] = useState({ name: "", email: "", role: "" });
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<SiteUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", roles: "", sources: "" });
  const [saving, setSaving] = useState(false);

  const [qrUser, setQrUser] = useState<SiteUser | null>(null);
  const [qrInfo, setQrInfo] = useState<MemberCodeInfo | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);

  const [permUser, setPermUser] = useState<SiteUser | null>(null);
  const [permDraft, setPermDraft] = useState<ScopePermissions | null>(null);
  const [permSaving, setPermSaving] = useState(false);

  const openPerm = (user: SiteUser) => {
    setPermUser(user);
    setPermDraft(user.permissions ? { ...user.permissions } : {});
  };

  const setPerm = (scope: AdminScope, value: boolean | undefined) => {
    setPermDraft((prev) => {
      const next = { ...(prev ?? {}) };
      if (value === undefined) delete next[scope];
      else next[scope] = value;
      return next;
    });
  };

  const savePerm = async () => {
    if (!permUser || !permDraft) return;
    setPermSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: permUser.email, permissions: permDraft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "failed");
      }
      setPermUser(null);
      setPermDraft(null);
      setMessage({ text: `Permissions updated for "${permUser.name}".`, type: "success" });
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? `Failed to update permissions: ${err.message}` : "Failed to update permissions",
        type: "error",
      });
    } finally {
      setPermSaving(false);
    }
  };

  const openQr = async (user: SiteUser) => {
    setQrUser(user);
    setQrInfo(null);
    setQrError(null);
    setQrBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/admin/users/qr?email=${encodeURIComponent(user.email)}`,
        { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.code) {
        setQrInfo({
          code: data.code,
          name: data.name || user.name,
          roles: Array.isArray(data.roles) ? data.roles : user.roles,
          version: data.version,
          issuedAt: data.issuedAt ?? null,
        });
      } else if (res.status === 404) {
        setQrError(
          "This member has no QR code issued yet. Codes are generated automatically when an application is approved."
        );
      } else {
        setQrError(data?.error ?? "Failed to load the member QR code.");
      }
    } catch {
      setQrError("Failed to load the member QR code.");
    } finally {
      setQrBusy(false);
    }
  };

  const regenerateQr = async () => {
    if (!qrUser) return;
    if (
      !window.confirm(
        `Regenerate the QR code for "${qrUser.name}" (${qrUser.email})?\n\nThe previous code will stop working immediately.`
      )
    ) {
      return;
    }
    setQrBusy(true);
    setQrError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: qrUser.email }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.code) {
        setQrInfo({
          code: data.code,
          name: data.name || qrUser.name,
          roles: Array.isArray(data.roles) ? data.roles : qrUser.roles,
          version: data.version,
          issuedAt: data.issuedAt ?? null,
        });
        setMessage({ text: `QR code regenerated for "${qrUser.name}".`, type: "success" });
      } else {
        setQrError(data?.error ?? "Failed to regenerate the QR code.");
      }
    } catch {
      setQrError("Failed to regenerate the QR code.");
    } finally {
      setQrBusy(false);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data.users)) setUsers(data.users);
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

  const assignRole = async (email: string, adminRole: string) => {
    setBusyEmail(email);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, adminRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "failed");
      }
      setMessage({ text: `Role updated to "${adminRole === "none" ? "None" : ROLE_LABELS[adminRole as AdminRole]}" for ${email}`, type: "success" });
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? `Failed to update role: ${err.message}` : "Failed to update role",
        type: "error",
      });
    } finally {
      setBusyEmail(null);
    }
  };

  const handleDelete = async (user: SiteUser) => {
    if (
      !window.confirm(
        `Delete the user "${user.name}" (${user.email})? This removes them from the directory and cannot be undone.`
      )
    ) {
      return;
    }
    setBusyEmail(user.email);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(user.email)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "failed");
      }
      setMessage({ text: `User "${user.name}" deleted.`, type: "success" });
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? `Failed to delete user: ${err.message}` : "Failed to delete user",
        type: "error",
      });
    } finally {
      setBusyEmail(null);
    }
  };

  const revokeJoinLimit = async (user: SiteUser) => {
    if (
      !window.confirm(
        `Revoke the join-application limit for "${user.name}" (${user.email})? They will be allowed to submit one more join request.`
      )
    ) {
      return;
    }
    setBusyEmail(user.email);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users/revoke-join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "failed");
      }
      setMessage({ text: `Join-application limit revoked for "${user.name}".`, type: "success" });
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? `Failed to revoke join limit: ${err.message}` : "Failed to revoke join limit",
        type: "error",
      });
    } finally {
      setBusyEmail(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      const token = await getToken();
      const roles = newUser.role ? [newUser.role.trim()] : [];
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newUser.name, email: newUser.email, roles }),
      });
      if (!res.ok) throw new Error("failed");
      setNewUser({ name: "", email: "", role: "" });
      setMessage({ text: "User added successfully!", type: "success" });
      await fetchAll();
    } catch {
      setMessage({ text: "Failed to add user", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user: SiteUser) => {
    setEditing(user);
    setEditForm({
      name: user.name,
      email: user.email,
      roles: user.roles.join(", "),
      sources: user.sources.join(", "),
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: editForm.email,
          name: editForm.name,
          roles: editForm.roles
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
          sources: editForm.sources
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "failed");
      }
      setEditing(null);
      setMessage({ text: `User "${editForm.name}" updated.`, type: "success" });
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? `Failed to update user: ${err.message}` : "Failed to update user",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const approved = users.filter((u) => Array.isArray(u.roles) && u.roles.length > 0);
    const q = query.trim().toLowerCase();
    if (!q) return approved;
    return approved.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.join(" ").toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Add user */}
        <div className="lg:col-span-4">
          <PanelCard>
            <PanelHeading
              title="Add User"
              subtitle="Register a member and assign a dashboard role."
              action={<UserPlus className="w-5 h-5 text-emerald-400" />}
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
            <form onSubmit={createUser} className="space-y-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="name@crescent.education"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Dashboard Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className={inputCls}
                >
                  <option value="">None</option>
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {creating ? "Adding..." : "Add User"}
              </button>
            </form>
          </PanelCard>
        </div>

        {/* Users list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users or roles..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <span className="text-xs font-mono text-gray-400">
              {filtered.length} approved member{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <PanelCard>
              <EmptyState message="No approved members found." />
            </PanelCard>
          ) : (
            <div className="space-y-3">
              {filtered.map((user) => {
                const current = adminRoleOf(user);
                const others = otherRolesOf(user);
                return (
                  <div
                    key={user.email}
                    className="rounded-2xl border border-white/10 bg-[#0d1317] p-5 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">{user.name}</h3>
                          {current ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${ROLE_BADGE[current]}`}
                            >
                              <Shield className="w-3 h-3" />
                              {ROLE_LABELS[current]}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                              No dashboard role
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-emerald-400 mt-0.5">{user.email}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {user.sources.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-400 uppercase"
                            >
                              {s}
                            </span>
                          ))}
                          {others.map((r) => (
                            <span
                              key={r}
                              className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-400 uppercase"
                            >
                              {r}
                            </span>
                          ))}
                          <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-500">
                            updated {new Date(user.updatedAt).toLocaleDateString()}
                          </span>
                          {user.joinResetAt && (
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300 uppercase">
                              Join limit lifted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase tracking-wider">
                          Assign dashboard role
                        </label>
                        <select
                          value={current ?? "none"}
                          disabled={busyEmail === user.email}
                          onChange={(e) => assignRole(user.email, e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors disabled:opacity-60"
                        >
                          <option value="none">None</option>
                          {ADMIN_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => revokeJoinLimit(user)}
                          disabled={busyEmail === user.email}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          title="Revoke the join-application limit so this user can apply once more"
                        >
                          {busyEmail === user.email ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Revoke Join Limit
                        </button>
                        <button
                          onClick={() => openQr(user)}
                          disabled={busyEmail === user.email}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          title="View or regenerate this member's QR code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR
                        </button>
                        <button
                          onClick={() => openPerm(user)}
                          disabled={busyEmail === user.email}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          title="Override dashboard access per section"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Permissions
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          disabled={busyEmail === user.email}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          title="Edit user"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={busyEmail === user.email}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          title="Delete user"
                        >
                          {busyEmail === user.email ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1317] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Edit User</h3>
                <p className="text-xs font-mono text-gray-400 mt-0.5">Update name, email, roles, or sources.</p>
              </div>
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Roles (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.roles}
                  onChange={(e) => setEditForm({ ...editForm, roles: e.target.value })}
                  placeholder="e.g. member"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Sources (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.sources}
                  onChange={(e) => setEditForm({ ...editForm, sources: e.target.value })}
                  placeholder="e.g. Instagram, Website"
                  className={inputCls}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permUser && permDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1317] p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-lg font-bold text-white">Dashboard Permissions</h3>
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  {permUser.name} · {permUser.email}
                </p>
              </div>
              <button
                onClick={() => setPermUser(null)}
                disabled={permSaving}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
              Overrides the access this user&apos;s dashboard role grants by default.{" "}
              <span className="text-gray-400">Allow</span> /{" "}
              <span className="text-gray-400">Deny</span> force a section on or off;{" "}
              <span className="text-gray-400">Role default</span> falls back to the assigned role.
            </p>

            <div className="space-y-2.5">
              {ALL_SCOPES.map((scope) => {
                const value = permDraft[scope];
                const roleDefault = hasScope(adminRoleOf(permUser), scope);
                return (
                  <div
                    key={scope}
                    className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-bold text-white">{SCOPE_LABELS[scope]}</span>
                      {value !== undefined ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                            value
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                          }`}
                        >
                          {value ? "Allowed" : "Denied"}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                            roleDefault
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/80"
                              : "bg-white/5 border-white/10 text-gray-500"
                          }`}
                        >
                          Role default: {roleDefault ? "allowed" : "denied"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          { label: "Allow", v: true },
                          { label: "Deny", v: false },
                        ] as { label: string; v: boolean }[]
                      ).map((opt) => {
                        const active = value === opt.v;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setPerm(scope, opt.v)}
                            disabled={permSaving}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all disabled:opacity-50 ${
                              active
                                ? opt.v
                                  ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300"
                                  : "bg-rose-500/25 border-rose-500/50 text-rose-300"
                                : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/25"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setPerm(scope, undefined)}
                        disabled={permSaving}
                        className={`flex-[1.4] px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all disabled:opacity-50 ${
                          value === undefined
                            ? "bg-white/15 border-white/30 text-white"
                            : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/25"
                        }`}
                      >
                        Role default
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-5">
              <button
                type="button"
                onClick={() => setPermUser(null)}
                disabled={permSaving}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePerm}
                disabled={permSaving}
                className="flex-1 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {permSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {permSaving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1317] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Member QR Code</h3>
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  {qrUser.name} · {qrUser.email}
                </p>
              </div>
              <button
                onClick={() => setQrUser(null)}
                disabled={qrBusy}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center py-2">
              {qrBusy && !qrInfo ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                  <p className="text-xs font-mono text-gray-400">Loading code…</p>
                </div>
              ) : qrError ? (
                <div className="w-full p-4 rounded-xl text-xs font-mono flex items-start gap-2 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-left">
                  <span>{qrError}</span>
                </div>
              ) : qrInfo ? (
                <>
                  <MemberCard
                    name={qrInfo.name}
                    roles={qrInfo.roles}
                    code={qrInfo.code}
                    issuedAt={qrInfo.issuedAt}
                  />
                  <p className="text-[10px] font-mono text-gray-600 mt-4">
                    Card v{qrInfo.version} · {qrInfo.issuedAt ? `issued ${new Date(qrInfo.issuedAt).toLocaleDateString()}` : "issue date unknown"}
                  </p>
                  <button
                    type="button"
                    onClick={regenerateQr}
                    disabled={qrBusy}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    title="Revoke the current code and issue a new one"
                  >
                    {qrBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    {qrBusy ? "Regenerating..." : "Regenerate Code"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
