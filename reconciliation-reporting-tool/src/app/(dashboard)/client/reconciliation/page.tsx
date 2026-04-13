"use client";

import { useEffect, useMemo, useState } from "react";

type ReconciliationRow = {
  id: string;
  status: string;
  month: number;
  year: number;
  createdAt: string;
  service?: { code: string; name: string } | null;
  opco?: { code: string; name: string } | null;
  partner?: { code: string; name: string } | null;
  _count?: { items: number; invoices: number } | null;
};

export default function ClientReconciliationPage() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [serviceId, setServiceId] = useState("");
  const [opcoId, setOpcoId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const res = await fetch("/api/reconciliation/results", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Failed to load reconciliations");
      return;
    }
    setRows(data.reconciliations ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/reconciliation/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          serviceId,
          opcoId: opcoId || null,
          partnerId: partnerId || null,
          remarks: remarks || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Failed to run reconciliation");
        return;
      }
      await refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Reconciliation</h1>
        <p className="text-sm text-zinc-600">
          Run reconciliation (stub engine for now) and view recent runs.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1">
            <div className="text-sm font-medium">Month</div>
            <input
              className="w-full rounded border px-3 py-2"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Year</div>
            <input
              className="w-full rounded border px-3 py-2"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Service ID</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              placeholder="serviceId"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">OpCo ID (optional)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={opcoId}
              onChange={(e) => setOpcoId(e.target.value)}
              placeholder="opcoId"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Partner ID (optional)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="partnerId"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Remarks (optional)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="notes"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={run}
            disabled={running || !serviceId}
          >
            {running ? "Running…" : "Run reconciliation"}
          </button>
          <button
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-60"
            onClick={() => void refresh()}
            disabled={running}
          >
            Refresh
          </button>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 font-medium">Recent runs</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">OpCo</th>
                <th className="px-4 py-2">Partner</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    {r.year}-{String(r.month).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2">
                    {r.service ? `${r.service.code} — ${r.service.name}` : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {r.opco ? `${r.opco.code} — ${r.opco.name}` : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {r.partner ? `${r.partner.code} — ${r.partner.name}` : "-"}
                  </td>
                  <td className="px-4 py-2">{r._count?.items ?? "-"}</td>
                  <td className="px-4 py-2">{r._count?.invoices ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-600" colSpan={7}>
                    No reconciliations yet.
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
