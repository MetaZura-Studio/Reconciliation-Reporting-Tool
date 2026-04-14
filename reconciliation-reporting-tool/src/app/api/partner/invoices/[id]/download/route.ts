import path from "node:path";
import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import { UPLOADS_DIR } from "@/lib/uploads";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "PARTNER") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const upload = await prisma.partnerInvoiceUpload.findUnique({
    where: { id },
    select: {
      id: true,
      partnerId: true,
      fileName: true,
      filePath: true,
      fileMimeType: true,
    },
  });
  if (!upload) {
    return NextResponse.json(
      { ok: false, message: "Not found" },
      { status: 404 },
    );
  }

  const assigned = await prisma.userPartner.findUnique({
    where: {
      userId_partnerId: { userId: auth.user.id, partnerId: upload.partnerId },
    },
    select: { partnerId: true },
  });
  if (!assigned) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  const resolvedUploads = path.resolve(UPLOADS_DIR);
  const resolvedFile = path.resolve(upload.filePath);
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
      "content-type": upload.fileMimeType || "application/octet-stream",
      "content-disposition": `attachment; filename="${upload.fileName}"`,
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

