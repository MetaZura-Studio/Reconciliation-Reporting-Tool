import { prisma } from "@/lib/db";

type RunResult = {
  ok: true;
  created: number;
  skipped: number;
  details: Array<{
    reminderId: string;
    recipientId: string;
    recipientTo: string;
    reason: "CREATED" | "DUPLICATE_WINDOW" | "COMPLETED";
  }>;
};

function renderTemplateBody(body: string, vars: Record<string, string>) {
  let out = body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function getPreviousPeriod(now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m === 1) return { month: 12, year: y - 1 };
  return { month: m - 1, year: y };
}

function getDueDateForPeriod(params: { month: number; year: number }) {
  // SRS does not mandate a specific due day; this is a practical default.
  // Due date = 10th of the *next* month after the reporting period.
  const nextMonth = params.month === 12 ? 1 : params.month + 1;
  const nextYear = params.month === 12 ? params.year + 1 : params.year;
  return new Date(nextYear, nextMonth - 1, 10, 9, 0, 0, 0);
}

export async function runReminderEngine(params?: { now?: Date }): Promise<RunResult> {
  const now = params?.now ?? new Date();

  const reminders = await prisma.reminderSetting.findMany({
    where: { isActive: true },
    include: { template: true },
    orderBy: { name: "asc" },
  });

  const period = getPreviousPeriod(now);
  const dueAt = getDueDateForPeriod(period);

  let created = 0;
  let skipped = 0;
  const details: RunResult["details"] = [];

  for (const r of reminders) {
    // Keep back-compat in sync
    if (r.daysBeforeDue !== r.daysOffset) {
      await prisma.reminderSetting.update({
        where: { id: r.id },
        data: { daysBeforeDue: r.daysOffset },
      });
    }

    if (r.triggerEvent !== "REPORT_SUBMISSION_DUE") continue;

    const sendAt =
      r.triggerTiming === "BEFORE_DUE"
        ? new Date(dueAt.getTime() - r.daysOffset * 24 * 60 * 60 * 1000)
        : r.triggerTiming === "AFTER_DUE"
          ? new Date(dueAt.getTime() + r.daysOffset * 24 * 60 * 60 * 1000)
          : now;

    if (now < sendAt) continue;

    if (!r.template || !r.template.isActive) continue;

    if (r.targetRole === "OPCO") {
      const recipients = await prisma.user.findMany({
        where: {
          role: "OPCO",
          status: "ACTIVE",
          opcoAssignments: { some: {} },
        },
        select: { id: true, email: true, fullName: true, opcoAssignments: true },
      });

      for (const u of recipients) {
        const hasReport = await prisma.report.findFirst({
          where: {
            type: r.reportType,
            month: period.month,
            year: period.year,
            opcoId: { in: u.opcoAssignments.map((a) => a.opcoId) },
            status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"] },
          },
          select: { id: true },
        });

        if (hasReport) {
          skipped++;
          details.push({
            reminderId: r.id,
            recipientId: u.id,
            recipientTo: u.email,
            reason: "COMPLETED",
          });
          continue;
        }

        const windowDays = r.repeatEveryDays ?? 9999;
        const windowStart = new Date(
          now.getTime() - windowDays * 24 * 60 * 60 * 1000,
        );

        const recent = await prisma.notificationLog.findFirst({
          where: {
            recipientId: u.id,
            templateName: r.template.name,
            createdAt: { gt: windowStart },
          },
          select: { id: true },
        });

        if (recent) {
          skipped++;
          details.push({
            reminderId: r.id,
            recipientId: u.id,
            recipientTo: u.email,
            reason: "DUPLICATE_WINDOW",
          });
          continue;
        }

        const vars = {
          fullName: u.fullName,
          email: u.email,
          month: String(period.month).padStart(2, "0"),
          year: String(period.year),
          dueDate: dueAt.toISOString().slice(0, 10),
          reportType: r.reportType,
        };

        const subject = r.template.subject
          ? renderTemplateBody(r.template.subject, vars)
          : null;
        const body = renderTemplateBody(r.template.body, vars);

        await prisma.notificationLog.create({
          data: {
            channel: r.template.channel,
            templateName: r.template.name,
            subject,
            body,
            recipientId: u.id,
            recipientTo: u.email,
            status: "QUEUED",
            sentAt: null,
          },
          select: { id: true },
        });

        created++;
        details.push({
          reminderId: r.id,
          recipientId: u.id,
          recipientTo: u.email,
          reason: "CREATED",
        });
      }
    } else {
      const recipients = await prisma.user.findMany({
        where: {
          role: "PARTNER",
          status: "ACTIVE",
          partnerAssignments: { some: {} },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          partnerAssignments: true,
        },
      });

      for (const u of recipients) {
        const hasReport = await prisma.report.findFirst({
          where: {
            type: r.reportType,
            month: period.month,
            year: period.year,
            partnerId: { in: u.partnerAssignments.map((a) => a.partnerId) },
            status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"] },
          },
          select: { id: true },
        });

        if (hasReport) {
          skipped++;
          details.push({
            reminderId: r.id,
            recipientId: u.id,
            recipientTo: u.email,
            reason: "COMPLETED",
          });
          continue;
        }

        const windowDays = r.repeatEveryDays ?? 9999;
        const windowStart = new Date(
          now.getTime() - windowDays * 24 * 60 * 60 * 1000,
        );

        const recent = await prisma.notificationLog.findFirst({
          where: {
            recipientId: u.id,
            templateName: r.template.name,
            createdAt: { gt: windowStart },
          },
          select: { id: true },
        });

        if (recent) {
          skipped++;
          details.push({
            reminderId: r.id,
            recipientId: u.id,
            recipientTo: u.email,
            reason: "DUPLICATE_WINDOW",
          });
          continue;
        }

        const vars = {
          fullName: u.fullName,
          email: u.email,
          month: String(period.month).padStart(2, "0"),
          year: String(period.year),
          dueDate: dueAt.toISOString().slice(0, 10),
          reportType: r.reportType,
        };

        const subject = r.template.subject
          ? renderTemplateBody(r.template.subject, vars)
          : null;
        const body = renderTemplateBody(r.template.body, vars);

        await prisma.notificationLog.create({
          data: {
            channel: r.template.channel,
            templateName: r.template.name,
            subject,
            body,
            recipientId: u.id,
            recipientTo: u.email,
            status: "QUEUED",
            sentAt: null,
          },
          select: { id: true },
        });

        created++;
        details.push({
          reminderId: r.id,
          recipientId: u.id,
          recipientTo: u.email,
          reason: "CREATED",
        });
      }
    }
  }

  return { ok: true, created, skipped, details };
}

