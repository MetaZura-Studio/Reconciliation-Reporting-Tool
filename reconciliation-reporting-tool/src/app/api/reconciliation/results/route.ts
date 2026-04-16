import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const where =
    auth.user.role === "OPCO"
      ? {
          opcoId: {
            in: (
              await prisma.userOpCo.findMany({
                where: { userId: auth.user.id },
                select: { opcoId: true },
              })
            ).map((x) => x.opcoId),
          },
        }
      : auth.user.role === "PARTNER"
        ? {
            partnerId: {
              in: (
                await prisma.userPartner.findMany({
                  where: { userId: auth.user.id },
                  select: { partnerId: true },
                })
              ).map((x) => x.partnerId),
            },
          }
        : {};

  const reconciliations = await prisma.reconciliation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      month: true,
      year: true,
      remarks: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      service: { select: { id: true, code: true, name: true } },
      opco: { select: { id: true, code: true, name: true } },
      partner: { select: { id: true, code: true, name: true } },
      _count: { select: { items: true, invoices: true } },
    },
  });

  return NextResponse.json({ ok: true, reconciliations });
}

