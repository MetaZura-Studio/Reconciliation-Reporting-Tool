"use client";

import { useEffect, useState } from "react";

type WidgetState = {
  pendingReconciliations: number;
  mismatchItems: number;
  invoicesAwaitingReview: number;
  invoicesWithOutstanding: number;
};

export default function ClientDashboardPage() {
  const [widgets, setWidgets] = useState<WidgetState | null>(null);

  useEffect(() => {
    async function load() {
      const [r, i] = await Promise.all([
        fetch("/api/reconciliation/summary", { cache: "no-store" }).then((x) =>
          x.json().catch(() => null),
        ),
        fetch("/api/invoices/summary", { cache: "no-store" }).then((x) =>
          x.json().catch(() => null),
        ),
      ]);

      setWidgets({
        pendingReconciliations: r?.widgets?.pendingReconciliations ?? 0,
        mismatchItems: r?.widgets?.mismatchItems ?? 0,
        invoicesAwaitingReview: i?.widgets?.invoicesAwaitingReview ?? 0,
        invoicesWithOutstanding: i?.widgets?.invoicesWithOutstanding ?? 0,
      });
    }
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Client Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Financial operations (owned by Developer 2)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-zinc-600">Pending reconciliations</div>
          <div className="mt-1 text-2xl font-semibold">
            {widgets?.pendingReconciliations ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-zinc-600">Mismatch items</div>
          <div className="mt-1 text-2xl font-semibold">
            {widgets?.mismatchItems ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-zinc-600">Invoices awaiting review</div>
          <div className="mt-1 text-2xl font-semibold">
            {widgets?.invoicesAwaitingReview ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-zinc-600">Invoices with outstanding</div>
          <div className="mt-1 text-2xl font-semibold">
            {widgets?.invoicesWithOutstanding ?? "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <a
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
          href="/client/reconciliation"
        >
          <div className="font-medium">Reconciliation</div>
          <div className="text-sm text-zinc-600">Run and review results</div>
        </a>
        <a
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
          href="/client/invoices"
        >
          <div className="font-medium">Invoices</div>
          <div className="text-sm text-zinc-600">Generate and manage status</div>
        </a>
        <a
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
          href="/client/collections"
        >
          <div className="font-medium">Collections</div>
          <div className="text-sm text-zinc-600">Track OpCo collections received</div>
        </a>
        <a
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
          href="/client/payments"
        >
          <div className="font-medium">Payments</div>
          <div className="text-sm text-zinc-600">Partner payment tracking</div>
        </a>
        <a
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
          href="/client/search"
        >
          <div className="font-medium">Search &amp; Export</div>
          <div className="text-sm text-zinc-600">Find and export records</div>
        </a>
        <a
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
          href="/client/audit"
        >
          <div className="font-medium">Audit</div>
          <div className="text-sm text-zinc-600">Financial activity log</div>
        </a>
      </div>
    </div>
  );
}

