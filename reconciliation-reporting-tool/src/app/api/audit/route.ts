import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";
import { prisma } from "@/lib/db";
import { z } from "zod";

const QuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid filters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const q = parsed.data;

  const baseWhere =
    auth.user.role === "ADMIN" || auth.user.role === "CLIENT"
      ? {}
      : { actorId: auth.user.id };

  const items = await prisma.auditLog.findMany({
    where: {
      ...baseWhere,
      ...(q.action ? { action: { contains: q.action } } : {}),
      ...(q.entityType ? { entityType: { contains: q.entityType } } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...((q.from || q.to)
        ? {
            createdAt: {
              ...(q.from ? { gte: q.from } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      entityType: true,
      entityId: true,
      message: true,
      actor: { select: { id: true, email: true, fullName: true } },
      meta: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}

