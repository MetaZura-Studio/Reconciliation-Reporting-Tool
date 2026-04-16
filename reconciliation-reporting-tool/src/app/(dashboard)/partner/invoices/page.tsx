"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UploadRow = {
  id: string;
  month: number;
  year: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  currency: string | null;
  amount: string | null;
  reference: string | null;
  fileName: string;
  submittedAt: string;
  service: { id: string; code: string; name: string };
  opco: { id: string; code: string; name: string } | null;
  partner: { id: string; code: string; name: string };
};

type InvoiceRow = {
  id: string;
  status: string;
  month: number;
  year: number;
  currency: string | null;
  amount: string;
  service: { code: string };
  opco: { code: string };
  partner: { code: string };
  _count?: { collections: number; payments: number } | null;
};

export default function PartnerInvoicesPage() {
  const [tab, setTab] = useState<"uploads" | "financial">("uploads");
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => {
    return tab === "uploads" ? uploads.length : invoices.length;
  }, [invoices.length, tab, uploads.length]);

  async function loadUploads() {
    const res = await fetch("/api/partner/invoices", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed");
    setUploads(json.uploads ?? []);
  }

  async function loadFinancial() {
    const res = await fetch("/api/partner/invoices/financial", {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed");
    setInvoices(json.invoices ?? []);
  }

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        if (tab === "uploads") await loadUploads();
        else await loadFinancial();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-zinc-600">
            Upload your invoice files and view your invoice records.
          </p>
        </div>
        <Link
          href="/partner/invoices/upload"
          className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white"
        >
          Upload invoice
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            tab === "uploads" ? "bg-zinc-900 text-white" : "bg-white"
          }`}
          onClick={() => setTab("uploads")}
        >
          Uploads
        </button>
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            tab === "financial" ? "bg-zinc-900 text-white" : "bg-white"
          }`}
          onClick={() => setTab("financial")}
        >
          Invoice records
        </button>
        <div className="ml-auto text-sm text-zinc-600">{activeCount} items</div>
      </div>

      {tab === "uploads" ? (
        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm font-semibold text-zinc-900">Recent uploads</div>
          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Partner</th>
                  <th className="px-3 py-2">OpCo</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Invoice #</th>
                  <th className="px-3 py-2">Invoice date</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">
                      {String(u.month).padStart(2, "0")}/{u.year}
                    </td>
                    <td className="px-3 py-2">{u.partner.code}</td>
                    <td className="px-3 py-2">{u.opco?.code ?? "-"}</td>
                    <td className="px-3 py-2">{u.service.code}</td>
                    <td className="px-3 py-2">{u.invoiceNumber ?? "-"}</td>
                    <td className="px-3 py-2">
                      {u.invoiceDate ? new Date(u.invoiceDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {u.amount ? `${u.amount} ${u.currency ?? ""}` : "-"}
                    </td>
                    <td className="px-3 py-2">{u.reference ?? "-"}</td>
                    <td className="px-3 py-2">
                      {new Date(u.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
                        href={`/api/partner/invoices/${u.id}/download`}
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
                {uploads.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={9}>
                      No uploads yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm font-semibold text-zinc-900">Invoice records</div>
          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">OpCo</th>
                  <th className="px-3 py-2">Collections</th>
                  <th className="px-3 py-2">Payments</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {r.year}-{String(r.month).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">
                      {r.amount} {r.currency ?? ""}
                    </td>
                    <td className="px-3 py-2">{r.service?.code ?? "-"}</td>
                    <td className="px-3 py-2">{r.opco?.code ?? "-"}</td>
                    <td className="px-3 py-2">{r._count?.collections ?? "-"}</td>
                    <td className="px-3 py-2">{r._count?.payments ?? "-"}</td>
                  </tr>
                ))}
                {invoices.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={7}>
                      No invoices yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

