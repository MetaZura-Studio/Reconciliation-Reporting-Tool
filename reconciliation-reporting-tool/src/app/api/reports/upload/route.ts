import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import { saveUploadedFile } from "@/lib/uploads";
import { writeAudit } from "@/modules/audit/logger";

const MetaSchema = z.object({
  type: z.enum([
    "OPCO_MONTHLY",
    "PARTNER_MONTHLY",
    "CLIENT_CONSOLIDATED",
    "FINAL_RS_CONFIRMATION",
  ]),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  serviceId: z.string().min(1),
  opcoId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
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
      { ok: false, message: "Report cannot be uploaded for a future period" },
      { status: 400 },
    );
  }

  // Basic role restrictions (safe defaults)
  if (auth.user.role === "OPCO" && meta.type !== "OPCO_MONTHLY") {
    return NextResponse.json(
      { ok: false, message: "OpCo users can only upload OpCo Monthly reports" },
      { status: 403 },
    );
  }
  if (auth.user.role === "PARTNER" && meta.type !== "PARTNER_MONTHLY") {
    return NextResponse.json(
      {
        ok: false,
        message: "Partner users can only upload Partner Monthly reports",
      },
      { status: 403 },
    );
  }

  // Entity assignment enforcement
  if (auth.user.role === "OPCO") {
    if (!meta.opcoId) {
      return NextResponse.json(
        { ok: false, message: "OpCo is required for OpCo Monthly uploads" },
        { status: 400 },
      );
    }
    const assigned = await prisma.userOpCo.findUnique({
      where: { userId_opcoId: { userId: auth.user.id, opcoId: meta.opcoId } },
      select: { opcoId: true },
    });
    if (!assigned) {
      return NextResponse.json(
        { ok: false, message: "You are not assigned to this OpCo" },
        { status: 403 },
      );
    }
  }
  if (auth.user.role === "PARTNER") {
    if (!meta.partnerId) {
      return NextResponse.json(
        { ok: false, message: "Partner is required for Partner Monthly uploads" },
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
  }

  // Revision flow: if a report exists for the same business key, supersede it and create a new version.
  const existing = await prisma.report.findFirst({
    where: {
      type: meta.type,
      month: meta.month,
      year: meta.year,
      serviceId: meta.serviceId,
      opcoId: meta.opcoId ?? null,
      partnerId: meta.partnerId ?? null,
      status: { notIn: ["ARCHIVED", "SUPERSEDED"] },
    },
    orderBy: { version: "desc" },
    select: { id: true, version: true },
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { fileName, fullPath } = await saveUploadedFile({
    subdir: `${meta.year}-${String(meta.month).padStart(2, "0")}`,
    originalName: file.name,
    bytes,
  });

  const report = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.report.update({
        where: { id: existing.id },
        data: { status: "SUPERSEDED" },
        select: { id: true },
      });
    }

    return await tx.report.create({
      data: {
        type: meta.type,
        month: meta.month,
        year: meta.year,
        serviceId: meta.serviceId,
        opcoId: meta.opcoId ?? null,
        partnerId: meta.partnerId ?? null,
        reference: meta.reference ?? null,
        remarks: meta.remarks ?? null,
        fileName,
        filePath: fullPath,
        fileMimeType: file.type || null,
        version: existing ? existing.version + 1 : 1,
        status: "SUBMITTED",
        submittedById: auth.user.id,
      },
      select: { id: true },
    });
  });

  await writeAudit({
    actorId: auth.user.id,
    action: existing ? "REPORT_UPLOAD_REVISION" : "REPORT_UPLOAD",
    entityType: "Report",
    entityId: report.id,
    message: existing ? "Report revision uploaded" : "Report uploaded",
    meta: {
      type: meta.type,
      month: meta.month,
      year: meta.year,
      serviceId: meta.serviceId,
      opcoId: meta.opcoId ?? null,
      partnerId: meta.partnerId ?? null,
      version: existing ? existing.version + 1 : 1,
    },
  });

  return NextResponse.json({ ok: true, reportId: report.id });
}

