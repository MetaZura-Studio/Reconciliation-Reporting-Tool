import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = z
    .object({
      q: z.string().optional().default(""),
      type: z.enum(["invoice", "collection", "payment", "all"]).optional().default("all"),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
      cursor: z.string().optional().nullable(),
    })
    .safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid filters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const q = parsed.data.q.trim();
  if (!q) return NextResponse.json({ ok: true, q, results: [], nextCursor: null });

  const limit = parsed.data.limit;
  const cursor = parsed.data.cursor ?? null;

  const partnerIds =
    auth.user.role === "PARTNER"
      ? (
          await prisma.userPartner.findMany({
            where: { userId: auth.user.id },
            select: { partnerId: true },
          })
        ).map((x) => x.partnerId)
      : null;

  const opcoIds =
    auth.user.role === "OPCO"
      ? (
          await prisma.userOpCo.findMany({
            where: { userId: auth.user.id },
            select: { opcoId: true },
          })
        ).map((x) => x.opcoId)
      : null;

  const [invoices, collections, payments] = await Promise.all([
    parsed.data.type === "all" || parsed.data.type === "invoice"
      ? prisma.invoice.findMany({
          where: {
            OR: [
              { id: { contains: q } },
              { invoiceNumber: { contains: q } },
              { remarks: { contains: q } },
            ],
            ...(auth.user.role === "PARTNER"
              ? { partnerId: { in: partnerIds ?? [] } }
              : auth.user.role === "OPCO"
                ? { opcoId: { in: opcoIds ?? [] } }
                : {}),
          },
          take: limit,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            month: true,
            year: true,
            amount: true,
            invoiceNumber: true,
          },
        })
      : Promise.resolve([]),
    parsed.data.type === "all" || parsed.data.type === "collection"
      ? prisma.collection.findMany({
          where: {
            OR: [
              { id: { contains: q } },
              { reference: { contains: q } },
              { remarks: { contains: q } },
            ],
            ...(auth.user.role === "OPCO"
              ? { opcoId: { in: opcoIds ?? [] } }
              : auth.user.role === "PARTNER"
                ? { invoice: { partnerId: { in: partnerIds ?? [] } } }
                : {}),
          },
          take: limit,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { receivedAt: "desc" },
          select: { id: true, month: true, year: true, amount: true, reference: true },
        })
      : Promise.resolve([]),
    parsed.data.type === "all" || parsed.data.type === "payment"
      ? prisma.payment.findMany({
          where: {
            OR: [
              { id: { contains: q } },
              { reference: { contains: q } },
              { remarks: { contains: q } },
            ],
            ...(auth.user.role === "PARTNER"
              ? { partnerId: { in: partnerIds ?? [] } }
              : auth.user.role === "OPCO"
                ? { invoice: { opcoId: { in: opcoIds ?? [] } } }
                : {}),
          },
          take: limit,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, month: true, year: true, amount: true, reference: true },
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...invoices.map((x) => ({ type: "invoice" as const, ...x })),
    ...collections.map((x) => ({ type: "collection" as const, ...x })),
    ...payments.map((x) => ({ type: "payment" as const, ...x })),
  ];

  const nextCursor = results.length > 0 ? String(results.at(-1)?.id ?? "") : null;

  return NextResponse.json({
    ok: true,
    q,
    type: parsed.data.type,
    limit,
    results,
    nextCursor: nextCursor || null,
  });
}

