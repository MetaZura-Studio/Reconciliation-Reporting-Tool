"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 10 &&
      newPassword === confirm &&
      !busy
    );
  }, [busy, confirm, currentPassword, newPassword]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) return setError("Passwords do not match");
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Failed");
      setDone("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Change Password</h1>
          <p className="text-sm text-zinc-600">Update your password.</p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {done ? <p className="mb-3 text-sm text-emerald-700">{done}</p> : null}
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Current password</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">New password</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-zinc-600">
                Must be 10+ chars with upper, lower, number, and special.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm password</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 w-full rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Updating..." : "Update password"}
            </button>
            <Link
              className="block text-center text-sm text-zinc-700 underline"
              href="/"
            >
              Back
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

