import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [
    users,
    opcos,
    partners,
    services,
    reports,
    templates,
    reminders,
    notificationLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.opCo.count(),
    prisma.partner.count(),
    prisma.service.count(),
    prisma.report.count(),
    prisma.notificationTemplate.count(),
    prisma.reminderSetting.count(),
    prisma.notificationLog.count(),
  ]);

  return NextResponse.json({
    ok: true,
    counts: {
      users,
      opcos,
      partners,
      services,
      reports,
      templates,
      reminders,
      notificationLogs,
    },
  });
}

