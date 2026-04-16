import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/modules/audit/logger";
import {
  runMatchingEngine,
  type ReconciliationEntry,
} from "@/modules/reconciliation/engine";

const RunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  serviceId: z.string().min(1),
  opcoId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  amountTolerance: z.coerce.number().nonnegative().optional(),
  opcoEntries: z
    .array(
      z.object({
        reference: z.string().min(1),
        amount: z.coerce.number(),
        meta: z.unknown().optional(),
      }),
    )
    .optional(),
  partnerEntries: z
    .array(
      z.object({
        reference: z.string().min(1),
        amount: z.coerce.number(),
        meta: z.unknown().optional(),
      }),
    )
    .optional(),
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

  if (auth.user.role === "OPCO") {
    if (!parsed.data.opcoId) {
      return NextResponse.json(
        { ok: false, message: "opcoId is required for OpCo users" },
        { status: 400 },
      );
    }
    const allowed = await prisma.userOpCo.findFirst({
      where: { userId: auth.user.id, opcoId: parsed.data.opcoId },
      select: { opcoId: true },
    });
    if (!allowed) {
      return NextResponse.json(
        { ok: false, message: "Forbidden: OpCo not assigned" },
        { status: 403 },
      );
    }
  }

  if (auth.user.role === "PARTNER") {
    if (!parsed.data.partnerId) {
      return NextResponse.json(
        { ok: false, message: "partnerId is required for Partner users" },
        { status: 400 },
      );
    }
    const allowed = await prisma.userPartner.findFirst({
      where: { userId: auth.user.id, partnerId: parsed.data.partnerId },
      select: { partnerId: true },
    });
    if (!allowed) {
      return NextResponse.json(
        { ok: false, message: "Forbidden: Partner not assigned" },
        { status: 403 },
      );
    }
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

  const opcoEntries: ReconciliationEntry[] =
    parsed.data.opcoEntries ?? [
      { reference: "TXN-001", amount: 100, meta: { source: "stub" } },
      { reference: "TXN-002", amount: 50, meta: { source: "stub" } },
      { reference: "TXN-003", amount: 25, meta: { source: "stub" } },
    ];
  const partnerEntries: ReconciliationEntry[] =
    parsed.data.partnerEntries ?? [
      { reference: "TXN-001", amount: 100, meta: { source: "stub" } },
      { reference: "TXN-002", amount: 45, meta: { source: "stub" } },
    ];

  const matches = runMatchingEngine(opcoEntries, partnerEntries, {
    amountTolerance: parsed.data.amountTolerance,
  });

  await prisma.reconciliationItem.createMany({
    data: matches.map((m) => ({
      reconciliationId: r.id,
      status: m.status,
      reference: m.reference,
      opcoAmount:
        m.opcoAmount === null ? null : Number(m.opcoAmount).toFixed(2),
      partnerAmount:
        m.partnerAmount === null ? null : Number(m.partnerAmount).toFixed(2),
      difference: Number(m.difference).toFixed(2),
      meta: m.meta ?? undefined,
    })),
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
    meta: {
      ...parsed.data,
      opcoEntriesCount: opcoEntries.length,
      partnerEntriesCount: partnerEntries.length,
    },
  });

  return NextResponse.json({ ok: true, reconciliationId: r.id });
}

