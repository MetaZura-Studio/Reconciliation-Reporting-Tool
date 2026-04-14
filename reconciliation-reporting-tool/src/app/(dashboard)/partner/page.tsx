"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Partner = { id: string; code: string; name: string };
type ReportRow = {
  id: string;
  month: number;
  year: number;
  status: string;
  submittedAt: string;
  service: { code: string };
  partner: { code: string } | null;
};

export default function PartnerDashboardPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string>("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setError(null);
      const res = await fetch("/api/users/me/assignments", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Failed to load assignments");
        return;
      }
      setPartners(json.partners ?? []);
      if ((json.partners ?? []).length > 0) setActivePartnerId(json.partners[0]!.id);
    })();
  }, []);

  useEffect(() => {
    if (!activePartnerId) return;
    void (async () => {
      setError(null);
      const params = new URLSearchParams({
        type: "PARTNER_MONTHLY",
        partnerId: activePartnerId,
      });
      const res = await fetch(`/api/reports?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Failed to load reports");
        return;
      }
      setReports((json.reports ?? []).slice(0, 5));
    })();
  }, [activePartnerId]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Partner Dashboard</h1>
        <p className="text-sm text-zinc-600">Quick links and recent activity.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/partner/reports"
          className="rounded-xl border bg-white p-5 hover:bg-zinc-50"
        >
          <div className="text-sm font-semibold text-zinc-900">Reports</div>
          <div className="mt-1 text-sm text-zinc-600">
            Upload and view Partner Monthly reports.
          </div>
        </Link>
        <Link
          href="/partner/invoices"
          className="rounded-xl border bg-white p-5 hover:bg-zinc-50"
        >
          <div className="text-sm font-semibold text-zinc-900">Invoices</div>
          <div className="mt-1 text-sm text-zinc-600">
            Upload invoice files and view your invoice records.
          </div>
        </Link>
        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm font-semibold text-zinc-900">Assignments</div>
          <div className="mt-1 text-sm text-zinc-600">
            {partners.length} Partner(s) assigned
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Recent reports</div>
            <div className="text-sm text-zinc-600">
              Latest uploads for your selected Partner.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={activePartnerId}
              onChange={(e) => setActivePartnerId(e.target.value)}
              disabled={partners.length === 0}
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            <Link
              href="/partner/reports"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              View all
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-lg border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Submitted</th>
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
                  <td className="px-3 py-2">
                    {new Date(r.submittedAt).toLocaleString()}
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
  );
}

