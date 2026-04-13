"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Topbar(props: { title?: string; userLabel: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-zinc-900">
          {props.title ?? "Dashboard"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-sm text-zinc-600 sm:block">
          {props.userLabel}
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={loading}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}

