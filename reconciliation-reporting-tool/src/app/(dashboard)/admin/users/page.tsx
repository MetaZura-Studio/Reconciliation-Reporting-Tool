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

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRow["role"]>("OPCO");
  const [status, setStatus] = useState<UserRow["status"]>("ACTIVE");
  const [tempPassword, setTempPassword] = useState("Temp@12345");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const json = (await res.json()) as
        | { ok: true; users: UserRow[] }
        | { ok: false; message?: string };
      if (!res.ok || !json.ok) {
        setError(("message" in json && json.message) || "Failed to load users");
        return;
      }
      setUsers(json.users);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Users</h1>
      <p className="text-sm text-zinc-600">Create and manage users (Admin only).</p>

      <div className="grid gap-6 pt-4 lg:grid-cols-2">
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
                  {sorted.map((u) => (
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
      </div>
    </div>
  );
}

