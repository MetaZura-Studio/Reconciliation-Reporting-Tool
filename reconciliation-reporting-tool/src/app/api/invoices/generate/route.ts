import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/modules/audit/logger";

const GenerateSchema = z.object({
  reconciliationId: z.string().optional().nullable(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  serviceId: z.string().min(1),
  opcoId: z.string().min(1),
  partnerId: z.string().min(1),
  currency: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  remarks: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = GenerateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.reconciliationId) {
    const exists = await prisma.reconciliation.findUnique({
      where: { id: parsed.data.reconciliationId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { ok: false, message: "Reconciliation not found" },
        { status: 404 },
      );
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      status: "GENERATED",
      month: parsed.data.month,
      year: parsed.data.year,
      serviceId: parsed.data.serviceId,
      opcoId: parsed.data.opcoId,
      partnerId: parsed.data.partnerId,
      reconciliationId: parsed.data.reconciliationId ?? null,
      currency: parsed.data.currency ?? null,
      amount: parsed.data.amount.toFixed(2),
      remarks: parsed.data.remarks ?? null,
      issuedAt: new Date(),
    },
    select: { id: true },
  });

  await writeAudit({
    actorId: auth.user.id,
    action: "INVOICE_GENERATE",
    entityType: "Invoice",
    entityId: invoice.id,
    message: "Invoice generated",
    meta: parsed.data,
  });

  return NextResponse.json({ ok: true, invoiceId: invoice.id });
}

