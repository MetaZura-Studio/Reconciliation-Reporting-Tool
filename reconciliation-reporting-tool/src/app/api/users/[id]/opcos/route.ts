import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";
import { writeAudit } from "@/modules/audit/logger";

const BodySchema = z.object({
  opcoIds: z.array(z.string().min(1)).default([]),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: userId } = await ctx.params;

  const rows = await prisma.userOpCo.findMany({
    where: { userId },
    select: { opcoId: true },
  });

  return NextResponse.json({ ok: true, opcoIds: rows.map((r) => r.opcoId) });
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

  const opcoIds = Array.from(new Set(parsed.data.opcoIds));

  await prisma.$transaction([
    prisma.userOpCo.deleteMany({ where: { userId } }),
    ...(opcoIds.length > 0
      ? [
          prisma.userOpCo.createMany({
            data: opcoIds.map((opcoId) => ({ userId, opcoId })),
          }),
        ]
      : []),
  ]);

  await writeAudit({
    actorId: auth.user.id,
    action: "USER_ASSIGN_OPCO",
    entityType: "User",
    entityId: userId,
    message: "Updated user OpCo assignments",
    meta: { opcoIds },
  });

  return NextResponse.json({ ok: true });
}

