import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ ok: true, results: [] });

  const [invoices, collections, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        OR: [
          { id: { contains: q } },
          { invoiceNumber: { contains: q } },
          { remarks: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, month: true, year: true, amount: true },
    }),
    prisma.collection.findMany({
      where: {
        OR: [
          { id: { contains: q } },
          { reference: { contains: q } },
          { remarks: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { receivedAt: "desc" },
      select: { id: true, month: true, year: true, amount: true, reference: true },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { id: { contains: q } },
          { reference: { contains: q } },
          { remarks: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, month: true, year: true, amount: true, reference: true },
    }),
  ]);

  const results = [
    ...invoices.map((x) => ({ type: "invoice" as const, ...x })),
    ...collections.map((x) => ({ type: "collection" as const, ...x })),
    ...payments.map((x) => ({ type: "payment" as const, ...x })),
  ];

  return NextResponse.json({ ok: true, q, results });
}

