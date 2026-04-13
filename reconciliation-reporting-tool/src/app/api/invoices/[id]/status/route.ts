import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/modules/audit/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const BodySchema = z.object({
    status: z.enum([
      "DRAFT",
      "GENERATED",
      "SENT",
      "PARTIALLY_PAID",
      "PAID",
      "CANCELLED",
    ]),
    remarks: z.string().optional().nullable(),
  });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, status: true, month: true, year: true, opcoId: true, amount: true },
  });
  if (!invoice) {
    return NextResponse.json(
      { ok: false, message: "Invoice not found" },
      { status: 404 },
    );
  }

  // Key business rule: partner invoice processing depends on OpCo collections received.
  // Enforce a safe minimum: cannot move into sent/paid states unless collections >= invoice amount.
  if (["SENT", "PARTIALLY_PAID", "PAID"].includes(parsed.data.status)) {
    const agg = await prisma.collection.aggregate({
      where: {
        opcoId: invoice.opcoId,
        year: invoice.year,
        month: invoice.month,
      },
      _sum: { amount: true },
    });
    const total = Number(agg._sum.amount ?? 0);
    const needed = Number(invoice.amount);
    if (Number.isFinite(needed) && total < needed) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Cannot update invoice status: required OpCo collections not received yet",
          details: { collected: total, required: needed },
        },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: parsed.data.status,
      remarks: parsed.data.remarks ?? undefined,
    },
    select: { id: true, status: true },
  });

  await writeAudit({
    actorId: auth.user.id,
    action: "INVOICE_STATUS_UPDATE",
    entityType: "Invoice",
    entityId: updated.id,
    message: `Invoice status: ${invoice.status} -> ${updated.status}`,
    meta: parsed.data,
  });

  return NextResponse.json({
    ok: true,
    message: "Invoice status updated",
    invoiceId: id,
    status: updated.status,
  });
}

