"use client";

import { useEffect, useMemo, useState } from "react";

type Service = { id: string; code: string; name: string };
type Partner = { id: string; code: string; name: string };

type ReportRow = {
  id: string;
  type: "PARTNER_MONTHLY";
  month: number;
  year: number;
  status: string;
  fileName: string;
  submittedAt: string;
  version: number;
  reference: string | null;
  service: Service;
  partner: Partner | null;
};

export default function PartnerReportsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [serviceId, setServiceId] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = useMemo(
    () => !!file && !!serviceId && !!partnerId && !busy,
    [busy, file, partnerId, serviceId],
  );

  async function loadMasters() {
    const [s, a] = await Promise.all([
      fetch("/api/masters/services").then((r) => r.json()),
      fetch("/api/users/me/assignments").then((r) => r.json()),
    ]);
    if (s?.ok) setServices(s.services);
    if (a?.ok) setPartners(a.partners);
  }

  async function loadReports(nextPartnerId: string) {
    const params = new URLSearchParams();
    params.set("type", "PARTNER_MONTHLY");
    if (nextPartnerId) params.set("partnerId", nextPartnerId);
    const res = await fetch(`/api/reports?${params.toString()}`);
    const json = (await res.json()) as
      | { ok: true; reports: ReportRow[] }
      | { ok: false; message?: string };
    if (!res.ok || !json.ok) {
      const message =
        "message" in json && json.message ? json.message : "Failed to load";
      throw new Error(message);
    }
    setReports(json.reports);
  }

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        await loadMasters();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0]!.id);
  }, [services, serviceId]);

  useEffect(() => {
    if (!partnerId && partners.length > 0) setPartnerId(partners[0]!.id);
  }, [partners, partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    void loadReports(partnerId).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load reports"),
    );
  }, [partnerId]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("File is required");
    if (!serviceId) return setError("Service is required");
    if (!partnerId) return setError("Partner assignment is required");

    setBusy(true);
    setError(null);
    try {
      const meta = {
        type: "PARTNER_MONTHLY" as const,
        month,
        year,
        serviceId,
        opcoId: null,
        partnerId,
        reference: reference || null,
      };
      const form = new FormData();
      form.set("meta", JSON.stringify(meta));
      form.set("file", file);

      const res = await fetch("/api/reports/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Upload failed");

      setFile(null);
      setReference("");
      await loadReports(partnerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Reports</h1>
      <p className="text-sm text-zinc-600">
        Upload and view Partner Monthly reports.
      </p>

      {error ? <p className="pt-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 pt-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Upload report</h2>
          <form className="mt-4 space-y-3" onSubmit={upload}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Partner</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  disabled={partners.length === 0}
                >
                  {partners.length === 0 ? (
                    <option value="">No Partner assignments</option>
                  ) : null}
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
                  <option value="" disabled>
                    Select service
                  </option>
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
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  inputMode="numeric"
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
              <label className="text-sm font-medium">File</label>
              <input
                type="file"
                className="block w-full text-sm"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <button
              type="submit"
              disabled={!canUpload}
              className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Recent reports</h2>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
              onClick={() =>
                void loadReports(partnerId).catch(() =>
                  setError("Failed to refresh"),
                )
              }
              disabled={!partnerId}
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {String(r.month).padStart(2, "0")}/{r.year}
                    </td>
                    <td className="px-3 py-2">{r.service.code}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-right">
                      <a
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
                        href={`/api/reports/${r.id}/download`}
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={4}>
                      No reports yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

