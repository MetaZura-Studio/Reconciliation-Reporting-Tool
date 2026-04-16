"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateRow = {
  id: string;
  name: string;
  channel: "EMAIL" | "SMS" | "IN_APP";
  subject: string | null;
  body: string;
  isActive: boolean;
  updatedAt: string;
};

type LogRow = {
  id: string;
  createdAt: string;
  channel: "EMAIL" | "SMS" | "IN_APP";
  templateName: string | null;
  subject: string | null;
  recipientTo: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
  recipient: { email: string; fullName: string } | null;
};

export default function AdminNotificationsPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<TemplateRow["channel"]>("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const canCreate = useMemo(
    () => name.trim().length > 0 && body.trim().length > 0 && !busy,
    [body, busy, name],
  );

  async function load() {
    const [t, l] = await Promise.all([
      fetch("/api/notifications/templates", { cache: "no-store" }).then((x) =>
        x.json(),
      ),
      fetch("/api/notifications/logs", { cache: "no-store" }).then((x) =>
        x.json(),
      ),
    ]);
    if (t?.ok) setTemplates(t.templates ?? []);
    if (l?.ok) setLogs(l.items ?? []);
  }

  useEffect(() => {
    void load().catch(() => setError("Failed to load"));
  }, []);

  async function runRemindersNow() {
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const res = await fetch("/api/notifications/run", { method: "POST" });
      const json = (await res.json()) as
        | { ok: true; created: number; skipped: number }
        | { ok: false; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(("message" in json && json.message) || "Run failed");
      }
      setRunResult(`Created ${json.created}, skipped ${json.skipped}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          channel,
          subject: subject || null,
          body,
          isActive: true,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok)
        throw new Error(json.message || "Create template failed");
      setName("");
      setSubject("");
      setBody("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create template failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTemplate(id: string, isActive: boolean) {
    setError(null);
    const prev = templates;
    setTemplates((x) => x.map((t) => (t.id === id ? { ...t, isActive } : t)));
    try {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Update failed");
    } catch (e) {
      setTemplates(prev);
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Notification Settings</h1>
      <p className="text-sm text-zinc-600">
        Manage templates and view notification logs (sending can remain stubbed).
      </p>

      {error ? <p className="pt-2 text-sm text-red-600">{error}</p> : null}
      {runResult ? <p className="pt-2 text-sm text-emerald-700">{runResult}</p> : null}

      <div className="grid gap-6 pt-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Create template</h2>
          <form className="mt-4 space-y-3" onSubmit={createTemplate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Channel</label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as TemplateRow["channel"])}
                >
                  <option value="EMAIL">EMAIL</option>
                  <option value="SMS">SMS</option>
                  <option value="IN_APP">IN_APP</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Subject (optional)</label>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Body</label>
              <textarea
                className="min-h-28 w-full rounded-md border px-3 py-2 text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
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
            <h2 className="text-sm font-semibold text-zinc-900">Templates</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                disabled={running}
                onClick={() => void runRemindersNow()}
              >
                {running ? "Running..." : "Run reminders now"}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
                onClick={() => void load().catch(() => setError("Failed to refresh"))}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2">{t.channel}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={t.isActive}
                        onChange={(e) => void toggleTemplate(t.id, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
                {templates.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={3}>
                      No templates yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Notification logs</h2>
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
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {l.recipientTo || l.recipient?.email || "-"}
                    </td>
                    <td className="px-3 py-2">{l.channel}</td>
                    <td className="px-3 py-2">{l.status}</td>
                    <td className="px-3 py-2">{l.error ?? "-"}</td>
                  </tr>
                ))}
                {logs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-600" colSpan={5}>
                      No notification logs yet.
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

