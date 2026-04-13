"use client";

import Link from "next/link";

const cards = [
  {
    title: "Users",
    description: "Create and manage user accounts and statuses.",
    href: "/admin/users",
  },
  {
    title: "Masters",
    description: "Manage OpCos, Partners, and Services.",
    href: "/admin/masters",
  },
  {
    title: "Reports",
    description: "Upload and view reports by period and service.",
    href: "/admin/reports",
  },
  {
    title: "Reminders",
    description: "Configure reminder settings (next).",
    href: "/admin/reminders",
  },
  {
    title: "Notifications",
    description: "Configure notification settings (next).",
    href: "/admin/notifications",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-zinc-600">
        Quick links to the Admin modules.
      </p>

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

