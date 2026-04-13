import type { ReactNode } from "react";
import type { UserRole } from "@/generated/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell(props: {
  role: UserRole;
  userLabel: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full">
        <Sidebar role={props.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={props.title} userLabel={props.userLabel} />
          <main className="flex-1 p-6">{props.children}</main>
        </div>
      </div>
    </div>
  );
}

