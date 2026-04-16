"use client";

import { useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  mobile: string | null;
  role: "ADMIN" | "CLIENT" | "OPCO" | "PARTNER";
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  createdAt?: string;
  lastLoginAt?: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [opcos, setOpCos] = useState<{ id: string; code: string; name: string }[]>(
    [],
  );
  const [partners, setPartners] = useState<
    { id: string; code: string; name: string }[]
  >([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRow["role"]>("OPCO");
  const [status, setStatus] = useState<UserRow["status"]>("ACTIVE");
  const [tempPassword, setTempPassword] = useState("Temp@12345");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRow["role"] | "ALL">("ALL");
  const [statusFilter, setStatusFilter] =
    useState<UserRow["status"] | "ALL">("ALL");

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );
  const [assignedOpcoIds, setAssignedOpcoIds] = useState<string[]>([]);
  const [assignedPartnerIds, setAssignedPartnerIds] = useState<string[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  const [editFullName, setEditFullName] = useState("");
  const [editMobile, setEditMobile] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRow["role"]>("OPCO");
  const [editStatus, setEditStatus] = useState<UserRow["status"]>("ACTIVE");
  const [savingUser, setSavingUser] = useState(false);

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.mobile ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, roleFilter, sorted, statusFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [res, oRes, pRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/masters/opcos"),
        fetch("/api/masters/partners"),
      ]);

      const json = (await res.json()) as
        | { ok: true; users: UserRow[] }
        | { ok: false; message?: string };
      if (!res.ok || !json.ok) {
        setError(("message" in json && json.message) || "Failed to load users");
        return;
      }
      setUsers(json.users);

      const oJson = (await oRes.json()) as
        | { ok: true; opcos: { id: string; code: string; name: string }[] }
        | { ok: false };
      if (oRes.ok && oJson.ok) setOpCos(oJson.opcos);

      const pJson = (await pRes.json()) as
        | { ok: true; partners: { id: string; code: string; name: string }[] }
        | { ok: false };
      if (pRes.ok && pJson.ok) setPartners(pJson.partners);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) setSelectedUserId(users[0]!.id);
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedUserId) return;
    void (async () => {
      setError(null);
      try {
        const [o, p] = await Promise.all([
          fetch(`/api/users/${selectedUserId}/opcos`).then((r) => r.json()),
          fetch(`/api/users/${selectedUserId}/partners`).then((r) => r.json()),
        ]);
        if (o?.ok) setAssignedOpcoIds(o.opcoIds ?? []);
        if (p?.ok) setAssignedPartnerIds(p.partnerIds ?? []);

        const u = users.find((x) => x.id === selectedUserId);
        if (u) {
          setEditFullName(u.fullName);
          setEditMobile(u.mobile ?? "");
          setEditRole(u.role);
          setEditStatus(u.status);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assignments");
      }
    })();
  }, [selectedUserId, users]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatedPassword(null);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          role,
          status,
          temporaryPassword: tempPassword,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; temporaryPassword?: string }
        | { ok: false; message?: string };
      if (!res.ok || !json.ok) {
        setError(("message" in json && json.message) || "Failed to create user");
        return;
      }
      setCreatedPassword(
        "temporaryPassword" in json && json.temporaryPassword
          ? json.temporaryPassword
          : null,
      );
      setFullName("");
      setEmail("");
      await load();
    } catch {
      setError("Network error");
    }
  }

  async function updateStatus(id: string, next: UserRow["status"]) {
    setError(null);
    const prev = users;
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, status: next } : x)));
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setUsers(prev);
        setError(json.message || "Failed to update status");
      }
    } catch {
      setUsers(prev);
      setError("Network error");
    }
  }

  async function saveUserEdits() {
    if (!selectedUserId) return;
    setSavingUser(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          mobile: editMobile ? editMobile : null,
          role: editRole,
          status: editStatus,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to save user");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save user");
    } finally {
      setSavingUser(false);
    }
  }

  async function saveAssignments() {
    if (!selectedUserId) return;
    setSavingAssignments(true);
    setError(null);
    try {
      const [oRes, pRes] = await Promise.all([
        fetch(`/api/users/${selectedUserId}/opcos`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ opcoIds: assignedOpcoIds }),
        }),
        fetch(`/api/users/${selectedUserId}/partners`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ partnerIds: assignedPartnerIds }),
        }),
      ]);
      const [oJson, pJson] = await Promise.all([oRes.json(), pRes.json()]);
      if (!oRes.ok || !oJson.ok) {
        throw new Error(oJson.message || "Failed to save OpCo assignments");
      }
      if (!pRes.ok || !pJson.ok) {
        throw new Error(pJson.message || "Failed to save Partner assignments");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save assignments");
    } finally {
      setSavingAssignments(false);
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Users</h1>
      <p className="text-sm text-zinc-600">Create and manage users (Admin only).</p>

      <div className="grid gap-6 pt-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Create user</h2>
          <form className="mt-4 space-y-3" onSubmit={createUser}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRow["role"])}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="CLIENT">Client</option>
                  <option value="OPCO">OpCo</option>
                  <option value="PARTNER">Partner</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as UserRow["status"])
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="tempPassword">
                  Temp password
                </label>
                <input
                  id="tempPassword"
                  className="h-10 w-full rounded-md border px-3 text-sm font-mono"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white"
            >
              Create
            </button>
            {createdPassword ? (
              <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
                Created. Temp password:{" "}
                <span className="font-mono">{createdPassword}</span>
              </div>
            ) : null}
          </form>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">All users</h2>
            <button
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
              type="button"
              onClick={() => void load()}
            >
              Refresh
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              className="h-9 rounded-md border px-3 text-sm sm:col-span-1"
              placeholder="Search name/email/mobile"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as UserRow["role"] | "ALL")
              }
            >
              <option value="ALL">All roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CLIENT">CLIENT</option>
              <option value="OPCO">OPCO</option>
              <option value="PARTNER">PARTNER</option>
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as UserRow["status"] | "ALL")
              }
            >
              <option value="ALL">All status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : null}
          {loading ? (
            <p className="mt-3 text-sm text-zinc-600">Loading...</p>
          ) : (
            <div className="mt-4 overflow-auto rounded-lg border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">{u.fullName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-2">{u.role}</td>
                      <td className="px-3 py-2">{u.status}</td>
                      <td className="px-3 py-2">
                        <select
                          className="h-9 rounded-md border px-2 text-sm"
                          value={u.status}
                          onChange={(e) =>
                            void updateStatus(
                              u.id,
                              e.target.value as UserRow["status"],
                            )
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="LOCKED">LOCKED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Assignments</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
                onClick={() => void saveUserEdits()}
                disabled={!selectedUserId || savingUser}
              >
                {savingUser ? "Saving..." : "Save user"}
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-black px-3 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => void saveAssignments()}
                disabled={!selectedUserId || savingAssignments}
              >
                {savingAssignments ? "Saving..." : "Save assignments"}
              </button>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">User</label>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={users.length === 0}
              >
                {sorted.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
              {selectedUser ? (
                <div className="text-xs text-zinc-600">
                  {selectedUser.fullName} • {selectedUser.status}
                </div>
              ) : null}
            </div>

            <div className="space-y-2 rounded-md border bg-zinc-50 p-3">
              <div className="text-sm font-medium">Edit user</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Full name
                  </label>
                  <input
                    className="h-9 w-full rounded-md border px-2 text-sm"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Mobile
                  </label>
                  <input
                    className="h-9 w-full rounded-md border px-2 text-sm"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Role</label>
                  <select
                    className="h-9 w-full rounded-md border px-2 text-sm"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRow["role"])}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="CLIENT">CLIENT</option>
                    <option value="OPCO">OPCO</option>
                    <option value="PARTNER">PARTNER</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Status
                  </label>
                  <select
                    className="h-9 w-full rounded-md border px-2 text-sm"
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as UserRow["status"])
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="LOCKED">LOCKED</option>
                  </select>
                </div>
              </div>
              <div className="text-xs text-zinc-600">
                Tip: if you change role, make sure assignments match the new role.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">OpCo assignments</div>
              <div className="max-h-52 space-y-1 overflow-auto rounded-md border p-2">
                {opcos.map((o) => {
                  const checked = assignedOpcoIds.includes(o.id);
                  const disabled = editRole !== "OPCO";
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        disabled ? "opacity-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...assignedOpcoIds, o.id]
                            : assignedOpcoIds.filter((x) => x !== o.id);
                          setAssignedOpcoIds(next);
                        }}
                      />
                      <span className="font-mono text-xs">{o.code}</span>
                      <span className="text-zinc-600">{o.name}</span>
                    </label>
                  );
                })}
                {opcos.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-zinc-600">
                    No OpCos yet.
                  </div>
                ) : null}
              </div>
              {selectedUser?.role !== "OPCO" ? (
                <div className="text-xs text-zinc-500">
                  OpCo assignments apply only to users with role OPCO.
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Partner assignments</div>
              <div className="max-h-52 space-y-1 overflow-auto rounded-md border p-2">
                {partners.map((p) => {
                  const checked = assignedPartnerIds.includes(p.id);
                  const disabled = editRole !== "PARTNER";
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        disabled ? "opacity-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...assignedPartnerIds, p.id]
                            : assignedPartnerIds.filter((x) => x !== p.id);
                          setAssignedPartnerIds(next);
                        }}
                      />
                      <span className="font-mono text-xs">{p.code}</span>
                      <span className="text-zinc-600">{p.name}</span>
                    </label>
                  );
                })}
                {partners.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-zinc-600">
                    No Partners yet.
                  </div>
                ) : null}
              </div>
              {selectedUser?.role !== "PARTNER" ? (
                <div className="text-xs text-zinc-500">
                  Partner assignments apply only to users with role PARTNER.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

