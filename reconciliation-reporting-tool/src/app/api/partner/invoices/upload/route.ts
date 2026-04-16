import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import { saveUploadedFile } from "@/lib/uploads";
import { writeAudit } from "@/modules/audit/logger";

const MetaSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  serviceId: z.string().min(1),
  partnerId: z.string().min(1),
  opcoId: z.string().min(1),
  invoiceNumber: z.string().min(1).max(80),
  invoiceDate: z.string().datetime(),
  currency: z.string().min(1).max(10),
  amount: z.coerce.number().positive(),
  reference: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

function isFuturePeriod(month: number, year: number) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  return year > curYear || (year === curYear && month > curMonth);
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "PARTNER") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { ok: false, message: "Invalid form data" },
      { status: 400 },
    );
  }

  const metaRaw = form.get("meta");
  const file = form.get("file");
  if (typeof metaRaw !== "string" || !(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Missing meta or file" },
      { status: 400 },
    );
  }

  const metaParsed = MetaSchema.safeParse(JSON.parse(metaRaw));
  if (!metaParsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid metadata", issues: metaParsed.error.issues },
      { status: 400 },
    );
  }

  const meta = metaParsed.data;
  if (isFuturePeriod(meta.month, meta.year)) {
    return NextResponse.json(
      { ok: false, message: "Invoice cannot be uploaded for a future period" },
      { status: 400 },
    );
  }
  const invoiceDate = new Date(meta.invoiceDate);
  if (invoiceDate.getTime() > Date.now()) {
    return NextResponse.json(
      { ok: false, message: "Invoice date cannot be in the future" },
      { status: 400 },
    );
  }

  const assigned = await prisma.userPartner.findUnique({
    where: {
      userId_partnerId: { userId: auth.user.id, partnerId: meta.partnerId },
    },
    select: { partnerId: true },
  });
  if (!assigned) {
    return NextResponse.json(
      { ok: false, message: "You are not assigned to this Partner" },
      { status: 403 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { fileName, fullPath } = await saveUploadedFile({
    subdir: `partner-invoices/${meta.year}-${String(meta.month).padStart(2, "0")}`,
    originalName: file.name,
    bytes,
  });

  try {
    const upload = await prisma.partnerInvoiceUpload.create({
      data: {
        partnerId: meta.partnerId,
        opcoId: meta.opcoId,
        serviceId: meta.serviceId,
        month: meta.month,
        year: meta.year,
        invoiceNumber: meta.invoiceNumber,
        invoiceDate,
        currency: meta.currency,
        amount: meta.amount.toFixed(2),
        reference: meta.reference ?? null,
        remarks: meta.remarks ?? null,
        fileName,
        filePath: fullPath,
        fileMimeType: file.type || null,
        submittedById: auth.user.id,
      },
      select: { id: true },
    });

    await writeAudit({
      actorId: auth.user.id,
      action: "PARTNER_INVOICE_UPLOAD",
      entityType: "PartnerInvoiceUpload",
      entityId: upload.id,
      message: "Partner invoice uploaded",
      meta: {
        partnerId: meta.partnerId,
        opcoId: meta.opcoId,
        serviceId: meta.serviceId,
        month: meta.month,
        year: meta.year,
        invoiceNumber: meta.invoiceNumber,
        amount: meta.amount,
        currency: meta.currency,
      },
    });

    return NextResponse.json({ ok: true, uploadId: upload.id });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Duplicate invoice number for same context" },
      { status: 409 },
    );
  }

}

