import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const [opcos, partners] = await Promise.all([
    prisma.userOpCo.findMany({
      where: { userId: auth.user.id },
      select: { opco: { select: { id: true, code: true, name: true } } },
      orderBy: { opco: { code: "asc" } },
    }),
    prisma.userPartner.findMany({
      where: { userId: auth.user.id },
      select: { partner: { select: { id: true, code: true, name: true } } },
      orderBy: { partner: { code: "asc" } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    opcos: opcos.map((r) => r.opco),
    partners: partners.map((r) => r.partner),
  });
}

