import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";
import { writeAudit } from "@/modules/audit/logger";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["EMAIL", "SMS", "IN_APP"]),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).max(10000),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.notificationTemplate.create({
      data: {
        name: parsed.data.name.trim(),
        channel: parsed.data.channel,
        subject: parsed.data.subject?.trim() || null,
        body: parsed.data.body,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await writeAudit({
      actorId: auth.user.id,
      action: "NOTIFICATION_TEMPLATE_CREATE",
      entityType: "NotificationTemplate",
      entityId: created.id,
      message: "Notification template created",
      meta: { name: created.name, channel: created.channel, isActive: created.isActive },
    });
    return NextResponse.json({ ok: true, template: created });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Template name already exists" },
      { status: 409 },
    );
  }
}

