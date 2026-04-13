import { prisma } from "@/lib/db";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
  meta?: unknown;
};

export async function writeAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      message: input.message ?? null,
      meta: input.meta ?? undefined,
    },
    select: { id: true },
  });
}

