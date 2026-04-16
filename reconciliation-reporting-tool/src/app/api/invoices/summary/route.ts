import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const [awaitingReview, outstandingPayments] = await Promise.all([
    prisma.invoice.count({
      where: { status: { in: ["GENERATED", "SENT"] } },
    }),
    prisma.invoice.count({
      where: { status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    widgets: {
      invoicesAwaitingReview: awaitingReview,
      invoicesWithOutstanding: outstandingPayments,
    },
  });
}

