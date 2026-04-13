import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/modules/audit/logger";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const collections = await prisma.collection.findMany({
    orderBy: { receivedAt: "desc" },
    take: 50,
    select: {
      id: true,
      month: true,
      year: true,
      currency: true,
      amount: true,
      receivedAt: true,
      reference: true,
      remarks: true,
      opco: { select: { id: true, code: true, name: true } },
      invoice: { select: { id: true, status: true } },
    },
  });

  return NextResponse.json({ ok: true, collections });
}

const CreateSchema = z.object({
  opcoId: z.string().min(1),
  invoiceId: z.string().optional().nullable(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  currency: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  receivedAt: z.coerce.date().optional(),
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

  if (parsed.data.invoiceId) {
    const inv = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: { id: true },
    });
    if (!inv) {
      return NextResponse.json(
        { ok: false, message: "Invoice not found" },
        { status: 404 },
      );
    }
  }

  const c = await prisma.collection.create({
    data: {
      opcoId: parsed.data.opcoId,
      invoiceId: parsed.data.invoiceId ?? null,
      month: parsed.data.month,
      year: parsed.data.year,
      currency: parsed.data.currency ?? null,
      amount: parsed.data.amount.toFixed(2),
      receivedAt: parsed.data.receivedAt ?? new Date(),
      reference: parsed.data.reference ?? null,
      remarks: parsed.data.remarks ?? null,
      meta: { source: "manual" },
    },
    select: { id: true },
  });

  await writeAudit({
    actorId: auth.user.id,
    action: "COLLECTION_CREATE",
    entityType: "Collection",
    entityId: c.id,
    message: "Collection recorded",
    meta: parsed.data,
  });

  return NextResponse.json({ ok: true, collectionId: c.id });
}

