import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";
import { writeAudit } from "@/modules/audit/logger";

const BodySchema = z.object({
  partnerIds: z.array(z.string().min(1)).default([]),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: userId } = await ctx.params;

  const rows = await prisma.userPartner.findMany({
    where: { userId },
    select: { partnerId: true },
  });

  return NextResponse.json({
    ok: true,
    partnerIds: rows.map((r) => r.partnerId),
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: userId } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const partnerIds = Array.from(new Set(parsed.data.partnerIds));

  await prisma.$transaction([
    prisma.userPartner.deleteMany({ where: { userId } }),
    ...(partnerIds.length > 0
      ? [
          prisma.userPartner.createMany({
            data: partnerIds.map((partnerId) => ({ userId, partnerId })),
          }),
        ]
      : []),
  ]);

  await writeAudit({
    actorId: auth.user.id,
    action: "USER_ASSIGN_PARTNER",
    entityType: "User",
    entityId: userId,
    message: "Updated user Partner assignments",
    meta: { partnerIds },
  });

  return NextResponse.json({ ok: true });
}

