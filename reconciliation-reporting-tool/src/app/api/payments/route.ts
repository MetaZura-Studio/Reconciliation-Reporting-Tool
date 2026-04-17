import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/modules/audit/logger";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

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

  const where =
    auth.user.role === "PARTNER"
      ? { partnerId: { in: partnerIds ?? [] } }
      : auth.user.role === "OPCO"
        ? { invoice: { opcoId: { in: opcoIds ?? [] } } }
        : {};

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      month: true,
      year: true,
      currency: true,
      amount: true,
      processedAt: true,
      reference: true,
      remarks: true,
      partner: { select: { id: true, code: true, name: true } },
      invoice: { select: { id: true, status: true } },
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, payments });
}

const CreateSchema = z.object({
  partnerId: z.string().min(1),
  invoiceId: z.string().optional().nullable(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  currency: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  status: z
    .enum(["PENDING", "PROCESSED", "FAILED", "REVERSED"])
    .optional()
    .default("PENDING"),
  processedAt: z.coerce.date().optional().nullable(),
  reference: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (auth.user.role === "PARTNER") {
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

  let linkedInvoice:
    | {
        id: string;
        status: string;
        month: number;
        year: number;
        opcoId: string;
        amount: unknown;
      }
    | null = null;

  if (parsed.data.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: {
        id: true,
        status: true,
        month: true,
        year: true,
        opcoId: true,
        partnerId: true,
        amount: true,
      },
    });
    if (!invoice) {
      return NextResponse.json(
        { ok: false, message: "Invoice not found" },
        { status: 404 },
      );
    }
    linkedInvoice = invoice;

    // Ensure payment partner matches invoice partner
    if (invoice.partnerId !== parsed.data.partnerId) {
      return NextResponse.json(
        { ok: false, message: "Invoice/Partner mismatch" },
        { status: 409 },
      );
    }

    if (auth.user.role === "OPCO") {
      const allowed = await prisma.userOpCo.findFirst({
        where: { userId: auth.user.id, opcoId: invoice.opcoId },
        select: { opcoId: true },
      });
      if (!allowed) {
        return NextResponse.json(
          { ok: false, message: "Forbidden: OpCo not assigned" },
          { status: 403 },
        );
      }
    }

    // Enforce the collections eligibility rule before allowing a PROCESSED payment.
    if (parsed.data.status === "PROCESSED") {
      const agg = await prisma.collection.aggregate({
        where: { opcoId: invoice.opcoId, year: invoice.year, month: invoice.month },
        _sum: { amount: true },
      });
      const total = Number(agg._sum.amount ?? 0);
      const needed = Number(invoice.amount);
      if (Number.isFinite(needed) && total < needed) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Cannot process partner payment: required OpCo collections not received yet",
            details: { collected: total, required: needed },
          },
          { status: 409 },
        );
      }
    }
  }

  const p = await prisma.payment.create({
    data: {
      partnerId: parsed.data.partnerId,
      invoiceId: parsed.data.invoiceId ?? null,
      month: parsed.data.month,
      year: parsed.data.year,
      currency: parsed.data.currency ?? null,
      amount: parsed.data.amount.toFixed(2),
      status: parsed.data.status,
      processedAt:
        parsed.data.status === "PROCESSED"
          ? parsed.data.processedAt ?? new Date()
          : null,
      reference: parsed.data.reference ?? null,
      remarks: parsed.data.remarks ?? null,
      meta: { source: "manual" },
    },
    select: { id: true },
  });

  await writeAudit({
    actorId: auth.user.id,
    action: "PAYMENT_CREATE",
    entityType: "Payment",
    entityId: p.id,
    message: "Payment recorded",
    meta: parsed.data,
  });

  // Partial payment workflow depth:
  // If a PROCESSED payment is linked to an invoice, update invoice status based on total processed payments.
  if (linkedInvoice && parsed.data.status === "PROCESSED") {
    const payAgg = await prisma.payment.aggregate({
      where: {
        invoiceId: linkedInvoice.id,
        status: "PROCESSED",
      },
      _sum: { amount: true },
    });

    const paid = Number(payAgg._sum.amount ?? 0);
    const due = Number(linkedInvoice.amount);
    const nextStatus =
      paid >= due ? ("PAID" as const) : ("PARTIALLY_PAID" as const);

    await prisma.invoice.update({
      where: { id: linkedInvoice.id },
      data: { status: nextStatus },
      select: { id: true },
    });

    await writeAudit({
      actorId: auth.user.id,
      action: "INVOICE_AUTO_STATUS_FROM_PAYMENT",
      entityType: "Invoice",
      entityId: linkedInvoice.id,
      message: `Auto invoice status from payments: ${linkedInvoice.status} -> ${nextStatus}`,
      meta: { paid, due, paymentId: p.id },
    });
  }

  return NextResponse.json({ ok: true, paymentId: p.id });
}

