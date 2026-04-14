"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Service = { id: string; code: string; name: string };
type Partner = { id: string; code: string; name: string };

export default function PartnerInvoiceUploadPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [partnerId, setPartnerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        const [s, a] = await Promise.all([
          fetch("/api/masters/services").then((r) => r.json()),
          fetch("/api/users/me/assignments").then((r) => r.json()),
        ]);
        if (s?.ok) setServices(s.services ?? []);
        if (a?.ok) setPartners(a.partners ?? []);
        if (!serviceId && (s.services ?? []).length > 0) setServiceId(s.services[0]!.id);
        if (!partnerId && (a.partners ?? []).length > 0) setPartnerId(a.partners[0]!.id);
      } catch {
        setError("Failed to load");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("File is required");
    if (!partnerId) return setError("Partner is required");
    if (!serviceId) return setError("Service is required");

    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const meta = {
        partnerId,
        serviceId,
        month,
        year,
        reference: reference || null,
        remarks: remarks || null,
      };
      const form = new FormData();
      form.set("meta", JSON.stringify(meta));
      form.set("file", file);

      const res = await fetch("/api/partner/invoices/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Upload failed");

      setFile(null);
      setReference("");
      setRemarks("");
      setDone("Uploaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Upload Partner Invoice</h1>
        <p className="text-sm text-zinc-600">
          Upload your invoice file for your Partner assignment.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5">
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {done ? <p className="mb-3 text-sm text-emerald-700">{done}</p> : null}

        <form className="space-y-3" onSubmit={upload}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Partner</label>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                disabled={partners.length === 0}
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Service</label>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Month</label>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Year</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Reference (optional)</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Remarks (optional)</label>
            <input
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">File</label>
            <input
              type="file"
              className="block w-full text-sm"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Uploading..." : "Upload"}
            </button>
            <Link
              href="/partner/invoices"
              className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-zinc-50"
            >
              Back to invoices
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

