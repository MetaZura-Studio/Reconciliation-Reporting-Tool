import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const items = await prisma.notificationLog.findMany({
    where: { recipientId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      channel: true,
      templateName: true,
      subject: true,
      status: true,
      error: true,
      sentAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}

