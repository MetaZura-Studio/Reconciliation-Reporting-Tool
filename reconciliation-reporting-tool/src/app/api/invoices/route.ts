import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Security-critical scoping per Dev1 handoff:
  // - PARTNER: only invoices for assigned partners (UserPartner)
  // - OPCO: only invoices for assigned opcos (UserOpCo)
  // - ADMIN/CLIENT: currently unrestricted (can be tightened later if desired)
  const where =
    auth.user.role === "PARTNER"
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
      : auth.user.role === "OPCO"
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
        : {};

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      month: true,
      year: true,
      invoiceNumber: true,
      currency: true,
      amount: true,
      issuedAt: true,
      dueAt: true,
      createdAt: true,
      service: { select: { id: true, code: true, name: true } },
      opco: { select: { id: true, code: true, name: true } },
      partner: { select: { id: true, code: true, name: true } },
      _count: { select: { collections: true, payments: true } },
    },
  });

  return NextResponse.json({ ok: true, invoices });
}

