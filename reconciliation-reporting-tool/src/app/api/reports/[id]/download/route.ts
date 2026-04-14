import path from "node:path";
import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import { UPLOADS_DIR } from "@/lib/uploads";

function canAccessReport(params: {
  role: "ADMIN" | "CLIENT" | "OPCO" | "PARTNER";
  assignedOpcoIds: string[];
  assignedPartnerIds: string[];
  report: { opcoId: string | null; partnerId: string | null; type: string };
}) {
  if (params.role === "ADMIN" || params.role === "CLIENT") return true;
  if (params.role === "OPCO") {
    return (
      params.report.type === "OPCO_MONTHLY" &&
      !!params.report.opcoId &&
      params.assignedOpcoIds.includes(params.report.opcoId)
    );
  }
  if (params.role === "PARTNER") {
    return (
      params.report.type === "PARTNER_MONTHLY" &&
      !!params.report.partnerId &&
      params.assignedPartnerIds.includes(params.report.partnerId)
    );
  }
  return false;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      fileName: true,
      filePath: true,
      fileMimeType: true,
      opcoId: true,
      partnerId: true,
    },
  });

  if (!report) {
    return NextResponse.json(
      { ok: false, message: "Not found" },
      { status: 404 },
    );
  }

  const [opcoRows, partnerRows] =
    auth.user.role === "OPCO" || auth.user.role === "PARTNER"
      ? await Promise.all([
          prisma.userOpCo.findMany({
            where: { userId: auth.user.id },
            select: { opcoId: true },
          }),
          prisma.userPartner.findMany({
            where: { userId: auth.user.id },
            select: { partnerId: true },
          }),
        ])
      : [[], []];

  const assignedOpcoIds = opcoRows.map((r) => r.opcoId);
  const assignedPartnerIds = partnerRows.map((r) => r.partnerId);

  if (
    !canAccessReport({
      role: auth.user.role,
      assignedOpcoIds,
      assignedPartnerIds,
      report,
    })
  ) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  const resolvedUploads = path.resolve(UPLOADS_DIR);
  const resolvedFile = path.resolve(report.filePath);
  if (!resolvedFile.startsWith(resolvedUploads + path.sep)) {
    return NextResponse.json(
      { ok: false, message: "Invalid file location" },
      { status: 500 },
    );
  }

  if (!fs.existsSync(resolvedFile)) {
    return NextResponse.json(
      { ok: false, message: "File missing" },
      { status: 404 },
    );
  }

  const nodeStream = fs.createReadStream(resolvedFile);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "content-type": report.fileMimeType || "application/octet-stream",
      "content-disposition": `attachment; filename="${report.fileName}"`,
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

