import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";
import { writeAudit } from "@/modules/audit/logger";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  targetRole: z.enum(["OPCO", "PARTNER"]).optional(),
  reportType: z
    .enum([
      "OPCO_MONTHLY",
      "PARTNER_MONTHLY",
      "CLIENT_CONSOLIDATED",
      "FINAL_RS_CONFIRMATION",
    ])
    .optional(),
  triggerEvent: z.enum(["REPORT_SUBMISSION_DUE"]).optional(),
  triggerTiming: z.enum(["BEFORE_DUE", "AFTER_DUE", "INSTANT"]).optional(),
  daysOffset: z.coerce.number().int().min(0).max(60).optional(),
  repeatEveryDays: z.coerce.number().int().min(1).max(60).nullable().optional(),
  isActive: z.boolean().optional(),
  templateId: z.string().nullable().optional(),
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
    const reminder = await prisma.reminderSetting.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.daysOffset !== undefined
          ? { daysBeforeDue: parsed.data.daysOffset }
          : {}),
      },
      include: { template: { select: { id: true, name: true } } },
    });
    await writeAudit({
      actorId: auth.user.id,
      action: "REMINDER_UPDATE",
      entityType: "ReminderSetting",
      entityId: reminder.id,
      message: "Reminder updated",
      meta: parsed.data,
    });
    return NextResponse.json({ ok: true, reminder });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Update failed" },
      { status: 400 },
    );
  }
}

