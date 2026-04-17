"use client";

import { useState } from "react";

type ResultRow = Record<string, unknown> & { type: string };

export default function ClientSearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "invoice" | "collection" | "payment">(
    "all",
  );
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function run(mode: "new" | "more") {
    setBusy(true);
    setError(null);
    try {
      const cursorParam =
        mode === "more" && nextCursor
          ? `&cursor=${encodeURIComponent(nextCursor)}`
          : "";
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=${type}&limit=20${cursorParam}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Search failed");
        return;
      }
      setNextCursor(data.nextCursor ?? null);
      setRows((prev) =>
        mode === "more" ? [...prev, ...(data.results ?? [])] : (data.results ?? []),
      );
    } finally {
      setBusy(false);
    }
  }

  async function runNew() {
    setRows([]);
    setNextCursor(null);
    await run("new");
  }

  async function loadMore() {
    if (!nextCursor) return;
    await run("more");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ q, type, results: rows }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_${type}_${q || "all"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const url = `/api/search/export?q=${encodeURIComponent(q)}&type=${type}&limit=500`;
    window.location.href = url;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Search &amp; Export</h1>
        <p className="text-sm text-zinc-600">
          Search across invoices, collections, and payments. Export results as
          JSON.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="w-full rounded border px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by id/reference/invoiceNumber..."
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={type}
            onChange={(e) =>
              setType(e.target.value as "all" | "invoice" | "collection" | "payment")
            }
          >
            <option value="all">All</option>
            <option value="invoice">Invoices</option>
            <option value="collection">Collections</option>
            <option value="payment">Payments</option>
          </select>
          <div className="flex gap-2">
            <button
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => void runNew()}
              disabled={busy || !q.trim()}
            >
              Search
            </button>
            <button
              className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-60"
              onClick={exportJson}
              disabled={rows.length === 0}
            >
              Export JSON
            </button>
            <button
              className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-60"
              onClick={exportCsv}
              disabled={busy || !q.trim()}
            >
              Export CSV
            </button>
          </div>
        </div>
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        <div className="mt-3">
          <button
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-60"
            onClick={() => void loadMore()}
            disabled={busy || !nextCursor}
          >
            Load more
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 font-medium">Results</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.type}-${String(r.id ?? "")}`} className="border-t">
                  <td className="px-4 py-2">{r.type}</td>
                  <td className="px-4 py-2">{String(r.id ?? "")}</td>
                  <td className="px-4 py-2">{String(r.status ?? "-")}</td>
                  <td className="px-4 py-2">{String(r.reference ?? "-")}</td>
                  <td className="px-4 py-2">{String(r.amount ?? "-")}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-600" colSpan={5}>
                    No results.
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

