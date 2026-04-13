import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const invoices = await prisma.invoice.findMany({
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

