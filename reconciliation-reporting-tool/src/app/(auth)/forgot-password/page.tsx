"use client";

import { useMemo, useState } from "react";

type Step = "request" | "reset";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const canReset = useMemo(() => {
    return (
      email.trim().length > 0 &&
      token.trim().length > 0 &&
      newPassword.length >= 10 &&
      newPassword === confirm &&
      !busy
    );
  }, [busy, confirm, email, newPassword, token]);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Failed");
      setDone(
        "If the email exists, a reset token has been generated. Check server logs for the stubbed token.",
      );
      setStep("reset");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request reset");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) return setError("Passwords do not match");
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Reset failed");
      setDone("Password updated. You can now log in with your new password.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
          <p className="text-sm text-zinc-600">
            Request a reset token, then set a new password.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {done ? <p className="mb-3 text-sm text-emerald-700">{done}</p> : null}

          {step === "request" ? (
            <form className="space-y-3" onSubmit={requestReset}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <input
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-10 w-full rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? "Sending..." : "Request reset"}
              </button>
              <button
                type="button"
                className="h-10 w-full rounded-md border px-4 text-sm font-medium hover:bg-zinc-50"
                onClick={() => setStep("reset")}
              >
                I already have a token
              </button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={resetPassword}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <input
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reset token</label>
                <input
                  className="h-10 w-full rounded-md border px-3 text-sm font-mono"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
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
                disabled={!canReset}
                className="h-10 w-full rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? "Updating..." : "Update password"}
              </button>
              <a
                className="block text-center text-sm text-zinc-700 underline"
                href="/login"
              >
                Back to login
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

