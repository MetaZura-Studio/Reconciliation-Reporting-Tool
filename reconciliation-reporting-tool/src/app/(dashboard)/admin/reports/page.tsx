"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Service = { id: string; code: string; name: string };
type OpCo = { id: string; code: string; name: string };
type Partner = { id: string; code: string; name: string };

type ReportType =
  | "OPCO_MONTHLY"
  | "PARTNER_MONTHLY"
  | "CLIENT_CONSOLIDATED"
  | "FINAL_RS_CONFIRMATION";

type ReportRow = {
  id: string;
  type: ReportType;
  month: number;
  year: number;
  status: string;
  fileName: string;
  reference: string | null;
  submittedAt: string;
  version: number;
  service: Service;
  opco: OpCo | null;
  partner: Partner | null;
  submittedBy: { fullName: string; email: string };
};

export default function AdminReportsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [opcos, setOpCos] = useState<OpCo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [type, setType] = useState<ReportType>("OPCO_MONTHLY");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [serviceId, setServiceId] = useState<string>("");
  const [opcoId, setOpCoId] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fType, setFType] = useState<ReportType | "">("");
  const [fMonth, setFMonth] = useState<string>("");
  const [fYear, setFYear] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");
  const [fServiceId, setFServiceId] = useState<string>("");
  const [fOpCoId, setFOpCoId] = useState<string>("");
  const [fPartnerId, setFPartnerId] = useState<string>("");
  const [fQ, setFQ] = useState<string>("");
  const [fSubmittedBy, setFSubmittedBy] = useState<string>("");

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (fType) p.set("type", fType);
    if (fMonth) p.set("month", fMonth);
    if (fYear) p.set("year", fYear);
    if (fStatus) p.set("status", fStatus);
    if (fServiceId) p.set("serviceId", fServiceId);
    if (fOpCoId) p.set("opcoId", fOpCoId);
    if (fPartnerId) p.set("partnerId", fPartnerId);
    if (fQ) p.set("q", fQ);
    if (fSubmittedBy) p.set("submittedBy", fSubmittedBy);
    return p.toString();
  }, [
    fMonth,
    fOpCoId,
    fPartnerId,
    fQ,
    fServiceId,
    fStatus,
    fSubmittedBy,
    fType,
    fYear,
  ]);

  const loadMasters = useCallback(async () => {
    const [s, o, p] = await Promise.all([
      fetch("/api/masters/services").then((r) => r.json()),
      fetch("/api/masters/opcos").then((r) => r.json()),
      fetch("/api/masters/partners").then((r) => r.json()),
    ]);
    if (s?.ok) setServices(s.services);
    if (o?.ok) setOpCos(o.opcos);
    if (p?.ok) setPartners(p.partners);
  }, []);

  const loadReports = useCallback(async () => {
    const res = await fetch(`/api/reports${filterParams ? `?${filterParams}` : ""}`);
    const json = (await res.json()) as
      | { ok: true; reports: ReportRow[] }
      | { ok: false; message?: string };
    if (!res.ok || !json.ok) {
      const message =
        "message" in json && json.message ? json.message : "Failed to load";
      throw new Error(message);
    }
    setReports(json.reports);
  }, [filterParams]);

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        await loadMasters();
        await loadReports();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [loadMasters, loadReports]);

  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0]!.id);
  }, [services, serviceId]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("File is required");
    if (!serviceId) return setError("Service is required");

    setBusy(true);
    setError(null);
    try {
      const meta = {
        type,
        month,
        year,
        serviceId,
        opcoId: opcoId || null,
        partnerId: partnerId || null,
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
      await loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Reports</h1>
      <p className="text-sm text-zinc-600">Upload and view reports (Admin).</p>

      {error ? <p className="pt-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 pt-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Upload report</h2>
          <form className="mt-4 space-y-3" onSubmit={upload}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Report type</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as ReportType)}
                >
                  <option value="OPCO_MONTHLY">OpCo Monthly</option>
                  <option value="PARTNER_MONTHLY">Partner Monthly</option>
                  <option value="CLIENT_CONSOLIDATED">Client Consolidated</option>
                  <option value="FINAL_RS_CONFIRMATION">Final RS Confirmation</option>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">OpCo (optional)</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={opcoId}
                  onChange={(e) => setOpCoId(e.target.value)}
                >
                  <option value="">(none)</option>
                  {opcos.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} - {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Partner (optional)</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                >
                  <option value="">(none)</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
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
              disabled={busy}
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
                void loadReports().catch(() => setError("Failed to refresh"))
              }
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 grid gap-2 rounded-lg border bg-zinc-50 p-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Type</label>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={fType}
                onChange={(e) => setFType(e.target.value as ReportType | "")}
              >
                <option value="">(any)</option>
                <option value="OPCO_MONTHLY">OPCO_MONTHLY</option>
                <option value="PARTNER_MONTHLY">PARTNER_MONTHLY</option>
                <option value="CLIENT_CONSOLIDATED">CLIENT_CONSOLIDATED</option>
                <option value="FINAL_RS_CONFIRMATION">FINAL_RS_CONFIRMATION</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Status</label>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
              >
                <option value="">(any)</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="SUPERSEDED">SUPERSEDED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Month</label>
              <input
                className="h-9 w-full rounded-md border px-2 text-sm"
                inputMode="numeric"
                placeholder="1-12"
                value={fMonth}
                onChange={(e) => setFMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Year</label>
              <input
                className="h-9 w-full rounded-md border px-2 text-sm"
                inputMode="numeric"
                placeholder="2026"
                value={fYear}
                onChange={(e) => setFYear(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Service</label>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={fServiceId}
                onChange={(e) => setFServiceId(e.target.value)}
              >
                <option value="">(any)</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">OpCo</label>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={fOpCoId}
                onChange={(e) => setFOpCoId(e.target.value)}
              >
                <option value="">(any)</option>
                {opcos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Partner</label>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={fPartnerId}
                onChange={(e) => setFPartnerId(e.target.value)}
              >
                <option value="">(any)</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">
                File / Reference
              </label>
              <input
                className="h-9 w-full rounded-md border px-2 text-sm"
                placeholder="search..."
                value={fQ}
                onChange={(e) => setFQ(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-zinc-700">
                Submitted by (name/email)
              </label>
              <input
                className="h-9 w-full rounded-md border px-2 text-sm"
                placeholder="search..."
                value={fSubmittedBy}
                onChange={(e) => setFSubmittedBy(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                className="h-9 rounded-md bg-black px-3 text-sm font-medium text-white"
                onClick={() =>
                  void loadReports().catch(() => setError("Failed to apply filters"))
                }
              >
                Apply filters
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">OpCo</th>
                  <th className="px-3 py-2">Partner</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">By</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {String(r.month).padStart(2, "0")}/{r.year}
                    </td>
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2">{r.service.code}</td>
                    <td className="px-3 py-2">{r.opco ? r.opco.code : "-"}</td>
                    <td className="px-3 py-2">
                      {r.partner ? r.partner.code : "-"}
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-zinc-600">
                        {r.submittedBy.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        {r.submittedBy.email}
                      </div>
                    </td>
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
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={8}>
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

