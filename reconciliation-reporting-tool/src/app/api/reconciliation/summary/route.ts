import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const [pending, mismatches] = await Promise.all([
    prisma.reconciliation.count({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
    prisma.reconciliationItem.count({ where: { status: { in: ["MISMATCH", "MISSING_IN_OPCO", "MISSING_IN_PARTNER"] } } }),
  ]);

  return NextResponse.json({
    ok: true,
    widgets: {
      pendingReconciliations: pending,
      mismatchItems: mismatches,
    },
  });
}

