import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";
import { z } from "zod";

function toCsvRow(values: Array<string | number | null | undefined>) {
  const escaped = values.map((v) => {
    const s = v === null || v === undefined ? "" : String(v);
    const needs = /[",\n]/.test(s);
    const inner = s.replace(/"/g, '""');
    return needs ? `"${inner}"` : inner;
  });
  return `${escaped.join(",")}\n`;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = z
    .object({
      q: z.string().optional().default(""),
      type: z.enum(["invoice", "collection", "payment"]).optional().default("invoice"),
      limit: z.coerce.number().int().min(1).max(5000).optional().default(500),
    })
    .safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid filters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const q = parsed.data.q.trim();
  const type = parsed.data.type;
  const limit = parsed.data.limit;

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

  let csv = "";

  if (type === "invoice") {
    csv += toCsvRow(["id", "status", "month", "year", "amount", "invoiceNumber"]);
    const rows = await prisma.invoice.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { id: { contains: q } },
                { invoiceNumber: { contains: q } },
                { remarks: { contains: q } },
              ],
            }
          : {}),
        ...(auth.user.role === "PARTNER"
          ? { partnerId: { in: partnerIds ?? [] } }
          : auth.user.role === "OPCO"
            ? { opcoId: { in: opcoIds ?? [] } }
            : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, month: true, year: true, amount: true, invoiceNumber: true },
    });
    for (const r of rows) {
      csv += toCsvRow([
        r.id,
        r.status,
        r.month,
        r.year,
        String(r.amount),
        r.invoiceNumber ?? "",
      ]);
    }
  }

  if (type === "collection") {
    csv += toCsvRow(["id", "month", "year", "amount", "reference", "opcoId", "invoiceId"]);
    const rows = await prisma.collection.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { id: { contains: q } },
                { reference: { contains: q } },
                { remarks: { contains: q } },
              ],
            }
          : {}),
        ...(auth.user.role === "OPCO"
          ? { opcoId: { in: opcoIds ?? [] } }
          : auth.user.role === "PARTNER"
            ? { invoice: { partnerId: { in: partnerIds ?? [] } } }
            : {}),
      },
      take: limit,
      orderBy: { receivedAt: "desc" },
      select: { id: true, month: true, year: true, amount: true, reference: true, opcoId: true, invoiceId: true },
    });
    for (const r of rows) {
      csv += toCsvRow([
        r.id,
        r.month,
        r.year,
        String(r.amount),
        r.reference ?? "",
        r.opcoId,
        r.invoiceId ?? "",
      ]);
    }
  }

  if (type === "payment") {
    csv += toCsvRow(["id", "status", "month", "year", "amount", "reference", "partnerId", "invoiceId"]);
    const rows = await prisma.payment.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { id: { contains: q } },
                { reference: { contains: q } },
                { remarks: { contains: q } },
              ],
            }
          : {}),
        ...(auth.user.role === "PARTNER"
          ? { partnerId: { in: partnerIds ?? [] } }
          : auth.user.role === "OPCO"
            ? { invoice: { opcoId: { in: opcoIds ?? [] } } }
            : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, month: true, year: true, amount: true, reference: true, partnerId: true, invoiceId: true },
    });
    for (const r of rows) {
      csv += toCsvRow([
        r.id,
        r.status,
        r.month,
        r.year,
        String(r.amount),
        r.reference ?? "",
        r.partnerId,
        r.invoiceId ?? "",
      ]);
    }
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"export_${type}.csv\"`,
    },
  });
}

