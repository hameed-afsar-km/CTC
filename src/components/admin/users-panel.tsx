"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, X, Shield } from "lucide-react";
import type { SiteUser } from "@/lib/users-store";
import { useAdmin } from "./admin-context";
import { EmptyState, LoadingState, PanelCard, PanelHeading, inputCls, labelCls } from "./ui";

export default function UsersPanel() {
  const { getToken } = useAdmin();
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [newUser, setNewUser] = useState({ name: "", email: "", role: "" });
  const [creating, setCreating] = useState(false);

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

  const saveRoles = async (email: string, roles: string[]) => {
    setBusyEmail(email);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, roles }),
      });
      if (!res.ok) throw new Error("failed");
      await fetchAll();
    } catch {
      setMessage({ text: "Failed to update roles", type: "error" });
    } finally {
      setBusyEmail(null);
    }
  };

  const addRole = (user: SiteUser) => {
    const value = (roleInput[user.email] ?? "").trim();
    if (!value) return;
    const next = Array.from(new Set([...user.roles, value]));
    saveRoles(user.email, next);
    setRoleInput((prev) => ({ ...prev, [user.email]: "" }));
  };

  const removeRole = (user: SiteUser, role: string) => {
    saveRoles(user.email, user.roles.filter((r) => r !== role));
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      const token = await getToken();
      const roles = newUser.role
        ? [newUser.role.trim()]
        : [];
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.roles.join(" ").toLowerCase().includes(q)
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
              subtitle="Manually register a member and assign a role."
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
                <label className={labelCls}>Initial Role</label>
                <input
                  type="text"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  placeholder="e.g. Core Team"
                  className={inputCls}
                />
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
            <span className="text-xs font-mono text-gray-400">{filtered.length} users</span>
          </div>

          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <PanelCard>
              <EmptyState message="No users found." />
            </PanelCard>
          ) : (
            <div className="space-y-3">
              {filtered.map((user) => (
                <div
                  key={user.email}
                  className="rounded-2xl border border-white/10 bg-[#0d1317] p-5 transition-all hover:border-white/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{user.name}</h3>
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
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-500">
                          updated {new Date(user.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400 mr-0.5" />
                      {user.roles.length === 0 && (
                        <span className="text-[10px] font-mono text-gray-500 uppercase">No roles</span>
                      )}
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300"
                        >
                          {role}
                          <button
                            onClick={() => removeRole(user, role)}
                            disabled={busyEmail === user.email}
                            className="hover:text-white transition-colors disabled:opacity-40"
                            title={`Remove ${role}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={roleInput[user.email] ?? ""}
                      onChange={(e) =>
                        setRoleInput((prev) => ({ ...prev, [user.email]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRole(user);
                        }
                      }}
                      placeholder="Add custom role... e.g. Tech Lead"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                    <button
                      onClick={() => addRole(user)}
                      disabled={busyEmail === user.email}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
