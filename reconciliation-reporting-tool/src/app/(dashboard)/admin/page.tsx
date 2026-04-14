"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const cards = [
  {
    title: "Users",
    description: "Create and manage user accounts and statuses.",
    href: "/admin/users",
  },
  {
    title: "Masters",
    description: "Manage OpCos, Partners, Services, and Partner Services.",
    href: "/admin/masters",
  },
  {
    title: "Reports",
    description: "Upload and view reports by period and service.",
    href: "/admin/reports",
  },
  {
    title: "Reminders",
    description: "Configure reminder rules.",
    href: "/admin/reminders",
  },
  {
    title: "Notifications",
    description: "Manage templates and view logs.",
    href: "/admin/notifications",
  },
];

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/summary", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json?.ok) setCounts(json.counts ?? null);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-zinc-600">
        Quick links to the Admin modules.
      </p>

      {counts ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs text-zinc-600">Users</div>
            <div className="text-2xl font-semibold">{counts.users ?? 0}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs text-zinc-600">Reports</div>
            <div className="text-2xl font-semibold">{counts.reports ?? 0}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs text-zinc-600">Templates</div>
            <div className="text-2xl font-semibold">{counts.templates ?? 0}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs text-zinc-600">Reminders</div>
            <div className="text-2xl font-semibold">{counts.reminders ?? 0}</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border bg-white p-5 hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold text-zinc-900">{c.title}</div>
            <div className="mt-1 text-sm text-zinc-600">{c.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

