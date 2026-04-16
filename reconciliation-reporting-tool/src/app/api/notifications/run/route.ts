import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/_utils/authz";
import { runReminderEngine } from "@/modules/notifications/engine";
import { writeAudit } from "@/modules/audit/logger";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const result = await runReminderEngine();
  await writeAudit({
    actorId: auth.user.id,
    action: "REMINDER_RUN",
    entityType: "ReminderEngine",
    entityId: null,
    message: "Reminder engine executed",
    meta: { created: result.created, skipped: result.skipped },
  });
  return NextResponse.json(result);
}

