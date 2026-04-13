"use client";

import { useEffect, useState } from "react";

type PaymentRow = {
  id: string;
  status: string;
  month: number;
  year: number;
  currency: string | null;
  amount: string;
  processedAt: string | null;
  reference: string | null;
  partner?: { code: string; name: string } | null;
  invoice?: { id: string; status: string } | null;
  createdAt: string;
};

export default function ClientPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [partnerId, setPartnerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [reference, setReference] = useState("");

  async function refresh() {
    setError(null);
    const res = await fetch("/api/payments", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setError(data?.message ?? "Failed to load payments");
      return;
    }
    setRows(data.payments ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partnerId,
          invoiceId: invoiceId || null,
          month,
          year,
          currency: currency || null,
          amount,
          status,
          reference: reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Failed to create payment");
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
        <h1 className="text-xl font-semibold">Payments</h1>
        <p className="text-sm text-zinc-600">
          Record partner payments. Processing payments can be blocked until OpCo
          collections are received (eligibility rule).
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
            <div className="text-sm font-medium">Invoice ID (optional)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="invoiceId"
            />
          </label>
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
          <label className="space-y-1">
            <div className="text-sm font-medium">Status</div>
            <select
              className="w-full rounded border px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="PENDING">PENDING</option>
              <option value="PROCESSED">PROCESSED</option>
              <option value="FAILED">FAILED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-sm font-medium">Reference (optional)</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="payment reference"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={busy || !partnerId || !amount}
            onClick={() => void create()}
          >
            Record payment
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
        <div className="border-b px-4 py-3 font-medium">Recent payments</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Partner</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {r.year}-{String(r.month).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-2">{r.partner?.code ?? "-"}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2">
                    {r.amount} {r.currency ?? ""}
                  </td>
                  <td className="px-4 py-2">{r.reference ?? "-"}</td>
                  <td className="px-4 py-2">
                    {r.invoice ? `${r.invoice.id} (${r.invoice.status})` : "-"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-600" colSpan={7}>
                    No payments yet.
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

