import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionUser } from "@/modules/auth/session";

export default async function DashboardLayout(props: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      role={user.role}
      userLabel={`${user.fullName} (${user.email})`}
    >
      {props.children}
    </AppShell>
  );
}

