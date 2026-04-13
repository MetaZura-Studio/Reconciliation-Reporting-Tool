import Link from "next/link";
import type { UserRole } from "@/generated/prisma";

type NavItem = { href: string; label: string };

function navForRole(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/masters", label: "Masters" },
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/reminders", label: "Reminders" },
      { href: "/admin/notifications", label: "Notifications" },
    ];
  }
  if (role === "OPCO") {
    return [
      { href: "/opco", label: "Dashboard" },
      { href: "/opco/reports", label: "Reports" },
      { href: "/opco/invoices", label: "Invoices" },
    ];
  }
  if (role === "PARTNER") {
    return [
      { href: "/partner", label: "Dashboard" },
      { href: "/partner/reports", label: "Reports" },
      { href: "/partner/invoices", label: "Invoices" },
    ];
  }
  return [{ href: "/client", label: "Client" }];
}

export function Sidebar(props: { role: UserRole }) {
  const nav = navForRole(props.role);
  return (
    <aside className="w-64 flex-shrink-0 border-r bg-white">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold text-zinc-900">
          Reconciliation Tool
        </div>
        <div className="mt-1 text-xs text-zinc-500">{props.role}</div>
      </div>
      <nav className="px-2 pb-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

