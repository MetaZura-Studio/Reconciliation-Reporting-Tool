import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  targetRole: z.enum(["OPCO", "PARTNER"]),
  reportType: z.enum([
    "OPCO_MONTHLY",
    "PARTNER_MONTHLY",
    "CLIENT_CONSOLIDATED",
    "FINAL_RS_CONFIRMATION",
  ]),
  daysBeforeDue: z.coerce.number().int().min(0).max(60).default(3),
  repeatEveryDays: z.coerce.number().int().min(1).max(60).optional().nullable(),
  isActive: z.boolean().optional(),
  templateId: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const reminders = await prisma.reminderSetting.findMany({
    orderBy: { name: "asc" },
    include: { template: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, reminders });
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
    const reminder = await prisma.reminderSetting.create({
      data: {
        name: parsed.data.name.trim(),
        targetRole: parsed.data.targetRole,
        reportType: parsed.data.reportType,
        daysBeforeDue: parsed.data.daysBeforeDue,
        repeatEveryDays: parsed.data.repeatEveryDays ?? null,
        isActive: parsed.data.isActive ?? true,
        templateId: parsed.data.templateId ?? null,
      },
      include: { template: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ok: true, reminder });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Reminder name already exists" },
      { status: 409 },
    );
  }
}

