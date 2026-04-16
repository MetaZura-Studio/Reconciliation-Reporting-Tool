import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";

const QuerySchema = z.object({
  opcoId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid filters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { opcoId, month, year } = parsed.data;

  const [colAgg, invAgg] = await Promise.all([
    prisma.collection.aggregate({
      where: { opcoId, month, year },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { opcoId, month, year },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const collected = Number(colAgg._sum.amount ?? 0);
  const invoiced = Number(invAgg._sum.amount ?? 0);
  const outstanding = Math.max(0, invoiced - collected);

  return NextResponse.json({
    ok: true,
    opcoId,
    month,
    year,
    totals: {
      collectionsCount: colAgg._count,
      invoicesCount: invAgg._count,
      collected,
      invoiced,
      outstanding,
    },
  });
}

