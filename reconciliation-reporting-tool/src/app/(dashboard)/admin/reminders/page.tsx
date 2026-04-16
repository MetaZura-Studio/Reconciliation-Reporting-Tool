"use client";

import { useEffect, useMemo, useState } from "react";

type Template = { id: string; name: string };
type ReminderRow = {
  id: string;
  name: string;
  targetRole: "OPCO" | "PARTNER";
  reportType:
    | "OPCO_MONTHLY"
    | "PARTNER_MONTHLY"
    | "CLIENT_CONSOLIDATED"
    | "FINAL_RS_CONFIRMATION";
  triggerEvent: "REPORT_SUBMISSION_DUE";
  triggerTiming: "BEFORE_DUE" | "AFTER_DUE" | "INSTANT";
  daysOffset: number;
  repeatEveryDays: number | null;
  isActive: boolean;
  template: Template | null;
};

export default function AdminRemindersPage() {
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState<ReminderRow["targetRole"]>("OPCO");
  const [reportType, setReportType] =
    useState<ReminderRow["reportType"]>("OPCO_MONTHLY");
  const [triggerEvent] = useState<ReminderRow["triggerEvent"]>(
    "REPORT_SUBMISSION_DUE",
  );
  const [triggerTiming, setTriggerTiming] =
    useState<ReminderRow["triggerTiming"]>("BEFORE_DUE");
  const [daysOffset, setDaysOffset] = useState<number>(3);
  const [repeatEveryDays, setRepeatEveryDays] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");

  const canCreate = useMemo(
    () => name.trim().length > 0 && !busy,
    [busy, name],
  );

  async function load() {
    const [r, t] = await Promise.all([
      fetch("/api/notifications/reminders", { cache: "no-store" }).then((x) =>
        x.json(),
      ),
      fetch("/api/notifications/templates", { cache: "no-store" }).then((x) =>
        x.json(),
      ),
    ]);
    if (t?.ok) setTemplates(t.templates ?? []);
    if (r?.ok) setReminders(r.reminders ?? []);
  }

  useEffect(() => {
    void load().catch(() => setError("Failed to load"));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          targetRole,
          reportType,
          triggerEvent,
          triggerTiming,
          daysOffset,
          repeatEveryDays: repeatEveryDays ? Number(repeatEveryDays) : null,
          templateId: templateId || null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Create failed");
      setName("");
      setRepeatEveryDays("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setError(null);
    const prev = reminders;
    setReminders((x) => x.map((r) => (r.id === id ? { ...r, isActive } : r)));
    try {
      const res = await fetch(`/api/notifications/reminders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Update failed");
    } catch (e) {
      setReminders(prev);
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Reminder Settings</h1>
      <p className="text-sm text-zinc-600">
        Configure reminder rules (sending is stubbed; logs can be recorded).
      </p>

      {error ? <p className="pt-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 pt-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Create reminder</h2>
          <form className="mt-4 space-y-3" onSubmit={create}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Target role</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={targetRole}
                  onChange={(e) =>
                    setTargetRole(e.target.value as ReminderRow["targetRole"])
                  }
                >
                  <option value="OPCO">OPCO</option>
                  <option value="PARTNER">PARTNER</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Report type</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as ReminderRow["reportType"])
                  }
                >
                  <option value="OPCO_MONTHLY">OPCO_MONTHLY</option>
                  <option value="PARTNER_MONTHLY">PARTNER_MONTHLY</option>
                  <option value="CLIENT_CONSOLIDATED">CLIENT_CONSOLIDATED</option>
                  <option value="FINAL_RS_CONFIRMATION">FINAL_RS_CONFIRMATION</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Trigger timing</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={triggerTiming}
                  onChange={(e) =>
                    setTriggerTiming(e.target.value as ReminderRow["triggerTiming"])
                  }
                >
                  <option value="BEFORE_DUE">BEFORE_DUE</option>
                  <option value="AFTER_DUE">AFTER_DUE</option>
                  <option value="INSTANT">INSTANT</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Days offset</label>
                <input
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  inputMode="numeric"
                  value={daysOffset}
                  onChange={(e) => setDaysOffset(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Repeat every (days)</label>
                <input
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  inputMode="numeric"
                  placeholder="(none)"
                  value={repeatEveryDays}
                  onChange={(e) => setRepeatEveryDays(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Template (optional)</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">(none)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canCreate}
              className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">All reminders</h2>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
              onClick={() => void load().catch(() => setError("Failed to refresh"))}
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Timing</th>
                  <th className="px-3 py-2">Offset</th>
                  <th className="px-3 py-2">Repeat</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.targetRole}</td>
                    <td className="px-3 py-2">{r.reportType}</td>
                    <td className="px-3 py-2">{r.triggerTiming}</td>
                    <td className="px-3 py-2">{r.daysOffset}d</td>
                    <td className="px-3 py-2">
                      {r.repeatEveryDays ? `${r.repeatEveryDays}d` : "-"}
                    </td>
                    <td className="px-3 py-2">{r.template?.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={(e) => void toggleActive(r.id, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
                {reminders.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={8}>
                      No reminders yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

