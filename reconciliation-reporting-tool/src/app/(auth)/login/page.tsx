"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as
        | { ok: true; redirectTo: string }
        | { ok: false; message?: string };
      if (!res.ok || !json.ok) {
        setError(
          "message" in json && json.message ? json.message : "Login failed",
        );
        return;
      }
      router.replace(json.redirectTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reconciliation &amp; Reporting Tool
          </h1>
          <p className="text-sm text-zinc-600">Login</p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="h-11 w-full rounded-md border px-3 text-sm"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="h-11 w-full rounded-md border px-3 text-sm"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="h-11 w-full rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <a className="text-zinc-700 underline" href="/forgot-password">
                Forgot Password
              </a>
              <a className="text-zinc-700 underline" href="/change-password">
                Change Password
              </a>
            </div>
            <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
              Dev seed user: <span className="font-mono">admin@example.com</span>{" "}
              / <span className="font-mono">Admin@12345</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

