import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "PARTNER") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.userPartner.findMany({
    where: { userId: auth.user.id },
    select: { partnerId: true },
  });
  const partnerIds = rows.map((r) => r.partnerId);

  const uploads = await prisma.partnerInvoiceUpload.findMany({
    where: { partnerId: { in: partnerIds } },
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      month: true,
      year: true,
      reference: true,
      fileName: true,
      fileMimeType: true,
      submittedAt: true,
      service: { select: { id: true, code: true, name: true } },
      partner: { select: { id: true, code: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, uploads });
}

