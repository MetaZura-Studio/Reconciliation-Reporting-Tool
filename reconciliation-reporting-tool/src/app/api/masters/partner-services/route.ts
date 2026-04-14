import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const LinkSchema = z.object({
  partnerId: z.string().min(1),
  serviceId: z.string().min(1),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const links = await prisma.partnerService.findMany({
    orderBy: [{ partner: { code: "asc" } }, { service: { code: "asc" } }],
    select: {
      partnerId: true,
      serviceId: true,
      createdAt: true,
      partner: { select: { id: true, code: true, name: true, status: true } },
      service: { select: { id: true, code: true, name: true, status: true } },
    },
  });

  return NextResponse.json({ ok: true, links });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = LinkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await prisma.partnerService.create({ data: parsed.data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Link already exists" },
      { status: 409 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = LinkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  await prisma.partnerService.delete({
    where: {
      partnerId_serviceId: {
        partnerId: parsed.data.partnerId,
        serviceId: parsed.data.serviceId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

