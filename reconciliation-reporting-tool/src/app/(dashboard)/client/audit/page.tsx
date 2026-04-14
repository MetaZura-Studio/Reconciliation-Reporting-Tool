"use client";

import { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  message: string | null;
  actor: { email: string; fullName: string } | null;
};

export default function ClientAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const res = await fetch("/api/audit", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Failed to load audit logs");
      return;
    }
    setRows(data.items ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/audit", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setError(data?.message ?? "Failed to load audit logs");
          return;
        }
        setError(null);
        setRows(data.items ?? []);
      } catch {
        if (cancelled) return;
        setError("Failed to load audit logs");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Audit</h1>
        <p className="text-sm text-zinc-600">
          Financial activity audit log (created by Dev 2 endpoints).
        </p>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-medium">Recent entries</div>
          <button
            className="rounded border px-3 py-1.5 text-sm font-medium"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        </div>
        {error ? <div className="px-4 py-3 text-sm text-red-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {r.actor ? `${r.actor.fullName} (${r.actor.email})` : "-"}
                  </td>
                  <td className="px-4 py-2">{r.action}</td>
                  <td className="px-4 py-2">
                    {r.entityType}
                    {r.entityId ? `:${r.entityId}` : ""}
                  </td>
                  <td className="px-4 py-2">{r.message ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-600" colSpan={5}>
                    No audit entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

