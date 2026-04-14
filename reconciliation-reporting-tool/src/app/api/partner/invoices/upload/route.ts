import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import { saveUploadedFile } from "@/lib/uploads";

const MetaSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  serviceId: z.string().min(1),
  partnerId: z.string().min(1),
  reference: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

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

  const upload = await prisma.partnerInvoiceUpload.create({
    data: {
      partnerId: meta.partnerId,
      serviceId: meta.serviceId,
      month: meta.month,
      year: meta.year,
      reference: meta.reference ?? null,
      remarks: meta.remarks ?? null,
      fileName,
      filePath: fullPath,
      fileMimeType: file.type || null,
      submittedById: auth.user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, uploadId: upload.id });
}

