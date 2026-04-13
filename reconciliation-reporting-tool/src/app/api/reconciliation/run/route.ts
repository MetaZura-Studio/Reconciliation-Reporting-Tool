import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/modules/audit/logger";

const RunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  serviceId: z.string().min(1),
  opcoId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = RunSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const r = await prisma.reconciliation.create({
    data: {
      status: "RUNNING",
      month: parsed.data.month,
      year: parsed.data.year,
      serviceId: parsed.data.serviceId,
      opcoId: parsed.data.opcoId ?? null,
      partnerId: parsed.data.partnerId ?? null,
      remarks: parsed.data.remarks ?? null,
      startedAt: new Date(),
    },
    select: { id: true },
  });

  // Placeholder engine: creates a few items; replace with real rules/parser later.
  await prisma.reconciliationItem.createMany({
    data: [
      {
        reconciliationId: r.id,
        status: "MATCHED",
        reference: "TXN-001",
        opcoAmount: "100.00",
        partnerAmount: "100.00",
        difference: "0.00",
        meta: { source: "stub" },
      },
      {
        reconciliationId: r.id,
        status: "MISMATCH",
        reference: "TXN-002",
        opcoAmount: "50.00",
        partnerAmount: "45.00",
        difference: "5.00",
        meta: { source: "stub" },
      },
    ],
  });

  await prisma.reconciliation.update({
    where: { id: r.id },
    data: { status: "COMPLETED", completedAt: new Date() },
    select: { id: true },
  });

  await writeAudit({
    actorId: auth.user.id,
    action: "RECONCILIATION_RUN",
    entityType: "Reconciliation",
    entityId: r.id,
    message: "Reconciliation executed",
    meta: parsed.data,
  });

  return NextResponse.json({ ok: true, reconciliationId: r.id });
}

