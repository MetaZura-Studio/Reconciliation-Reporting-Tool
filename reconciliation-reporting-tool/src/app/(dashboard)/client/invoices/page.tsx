"use client";

import { useEffect, useState } from "react";

type InvoiceRow = {
  id: string;
  status: string;
  month: number;
  year: number;
  currency: string | null;
  amount: string;
  service?: { code: string; name: string } | null;
  opco?: { code: string; name: string } | null;
  partner?: { code: string; name: string } | null;
  _count?: { collections: number; payments: number } | null;
};

export default function ClientInvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [serviceId, setServiceId] = useState("");
  const [opcoId, setOpcoId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [reconciliationId, setReconciliationId] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError(null);
    const res = await fetch("/api/invoices", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Failed to load invoices");
      return;
    }
    setRows(data.invoices ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reconciliationId: reconciliationId || null,
          month,
          year,
          serviceId,
          opcoId,
          partnerId,
          currency: currency || null,
          amount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Failed to generate invoice");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(invoiceId: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Failed to update status");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <p className="text-sm text-zinc-600">
          Generate invoices and update status. Status updates enforce the OpCo
          collections eligibility rule.
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
            <div className="text-sm font-medium">OpCo ID</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={opcoId}
              onChange={(e) => setOpcoId(e.target.value)}
              placeholder="opcoId"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Partner ID</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="partnerId"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Currency</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="USD"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">Amount</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-sm font-medium">Reconciliation ID (optional)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={reconciliationId}
              onChange={(e) => setReconciliationId(e.target.value)}
              placeholder="reconciliationId"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={busy || !serviceId || !opcoId || !partnerId || !amount}
            onClick={() => void generate()}
          >
            Generate invoice
          </button>
          <button
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-60"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh
          </button>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 font-medium">Recent invoices</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">OpCo</th>
                <th className="px-4 py-2">Partner</th>
                <th className="px-4 py-2">Collections</th>
                <th className="px-4 py-2">Payments</th>
                <th className="px-4 py-2">Actions</th>
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
                    {r.amount} {r.currency ?? ""}
                  </td>
                  <td className="px-4 py-2">
                    {r.service ? `${r.service.code}` : "-"}
                  </td>
                  <td className="px-4 py-2">{r.opco ? `${r.opco.code}` : "-"}</td>
                  <td className="px-4 py-2">
                    {r.partner ? `${r.partner.code}` : "-"}
                  </td>
                  <td className="px-4 py-2">{r._count?.collections ?? "-"}</td>
                  <td className="px-4 py-2">{r._count?.payments ?? "-"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
                        disabled={busy}
                        onClick={() => void updateStatus(r.id, "SENT")}
                      >
                        Mark SENT
                      </button>
                      <button
                        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
                        disabled={busy}
                        onClick={() => void updateStatus(r.id, "PAID")}
                      >
                        Mark PAID
                      </button>
                      <button
                        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
                        disabled={busy}
                        onClick={() => void updateStatus(r.id, "CANCELLED")}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-600" colSpan={9}>
                    No invoices yet.
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

