import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import type { Prisma } from "@/generated/prisma";

const QuerySchema = z.object({
  type: z
    .enum([
      "OPCO_MONTHLY",
      "PARTNER_MONTHLY",
      "CLIENT_CONSOLIDATED",
      "FINAL_RS_CONFIRMATION",
    ])
    .optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  serviceId: z.string().optional(),
  opcoId: z.string().optional(),
  partnerId: z.string().optional(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "ACCEPTED",
      "REJECTED",
      "SUPERSEDED",
      "ARCHIVED",
    ])
    .optional(),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid filters" },
      { status: 400 },
    );
  }

  const q = parsed.data;

  const where: Prisma.ReportWhereInput = {
    ...(q.type ? { type: q.type } : {}),
    ...(q.month ? { month: q.month } : {}),
    ...(q.year ? { year: q.year } : {}),
    ...(q.serviceId ? { serviceId: q.serviceId } : {}),
    ...(q.opcoId ? { opcoId: q.opcoId } : {}),
    ...(q.partnerId ? { partnerId: q.partnerId } : {}),
    ...(q.status ? { status: q.status } : {}),
  };

  // Safe restriction: non-admin can only see their own submissions for now.
  if (auth.user.role !== "ADMIN" && auth.user.role !== "CLIENT") {
    where.submittedById = auth.user.id;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      type: true,
      month: true,
      year: true,
      version: true,
      status: true,
      reference: true,
      fileName: true,
      submittedAt: true,
      service: { select: { id: true, code: true, name: true } },
      opco: { select: { id: true, code: true, name: true } },
      partner: { select: { id: true, code: true, name: true } },
      submittedBy: { select: { id: true, email: true, fullName: true } },
    },
  });

  return NextResponse.json({ ok: true, reports });
}

