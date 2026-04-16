"use client";

import { Fragment, useEffect, useState } from "react";

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  message: string | null;
  actor: { id: string; email: string; fullName: string } | null;
};

export default function ClientAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const qp = new URLSearchParams();
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    if (action) qp.set("action", action);
    if (entityType) qp.set("entityType", entityType);
    if (actorId) qp.set("actorId", actorId);
    qp.set("limit", "200");

    const res = await fetch(`/api/audit?${qp.toString()}`, { cache: "no-store" });
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

      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <div className="text-sm font-medium">From (ISO)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="2026-04-01T00:00:00Z"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">To (ISO)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="2026-04-30T23:59:59Z"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Action contains</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="INVOICE_"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Entity type contains</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="Invoice"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Actor ID</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="userId"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            className="rounded border px-3 py-1.5 text-sm font-medium"
            onClick={() => {
              setFrom("");
              setTo("");
              setAction("");
              setEntityType("");
              setActorId("");
              void refresh();
            }}
          >
            Clear
          </button>
          <button
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => void refresh()}
          >
            Apply filters
          </button>
        </div>
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
                <Fragment key={r.id}>
                  <tr
                    className="cursor-pointer border-t hover:bg-zinc-50"
                    onClick={() =>
                      setExpandedId((prev) => (prev === r.id ? null : r.id))
                    }
                  >
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
                  {expandedId === r.id ? (
                    <tr className="border-t bg-zinc-50">
                      <td className="px-4 py-3 text-xs text-zinc-700" colSpan={5}>
                        <div className="font-medium">Details</div>
                        <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
                          <div>
                            <span className="text-zinc-600">ID:</span> {r.id}
                          </div>
                          <div>
                            <span className="text-zinc-600">Actor ID:</span>{" "}
                            {r.actor?.id ?? "-"}
                          </div>
                          <div>
                            <span className="text-zinc-600">Entity:</span>{" "}
                            {r.entityType} {r.entityId ?? ""}
                          </div>
                        </div>
                        <div className="mt-2 text-zinc-600">
                          (Meta payload is available via API; UI viewer can be extended later.)
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
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

