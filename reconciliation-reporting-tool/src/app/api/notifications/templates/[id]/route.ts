import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";
import { writeAudit } from "@/modules/audit/logger";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  channel: z.enum(["EMAIL", "SMS", "IN_APP"]).optional(),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.subject !== undefined
          ? { subject: parsed.data.subject?.trim() || null }
          : {}),
      },
    });
    await writeAudit({
      actorId: auth.user.id,
      action: "NOTIFICATION_TEMPLATE_UPDATE",
      entityType: "NotificationTemplate",
      entityId: template.id,
      message: "Notification template updated",
      meta: parsed.data,
    });
    return NextResponse.json({ ok: true, template });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Update failed" },
      { status: 400 },
    );
  }
}

