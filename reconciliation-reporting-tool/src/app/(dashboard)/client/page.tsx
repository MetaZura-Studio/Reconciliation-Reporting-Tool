export default function ClientDashboardPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Client Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Financial operations (owned by Developer 2)
        </p>
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

