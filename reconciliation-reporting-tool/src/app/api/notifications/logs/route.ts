import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const items = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      channel: true,
      templateName: true,
      subject: true,
      recipientTo: true,
      status: true,
      error: true,
      sentAt: true,
      recipient: { select: { id: true, email: true, fullName: true } },
    },
  });

  return NextResponse.json({ ok: true, items });
}

