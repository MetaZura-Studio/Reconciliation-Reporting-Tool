import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "PARTNER") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.userPartner.findMany({
    where: { userId: auth.user.id },
    select: { partnerId: true },
  });
  const partnerIds = rows.map((r) => r.partnerId);

  const invoices = await prisma.invoice.findMany({
    where: { partnerId: { in: partnerIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      month: true,
      year: true,
      invoiceNumber: true,
      currency: true,
      amount: true,
      issuedAt: true,
      dueAt: true,
      createdAt: true,
      service: { select: { id: true, code: true, name: true } },
      opco: { select: { id: true, code: true, name: true } },
      partner: { select: { id: true, code: true, name: true } },
      _count: { select: { collections: true, payments: true } },
    },
  });

  return NextResponse.json({ ok: true, invoices });
}

