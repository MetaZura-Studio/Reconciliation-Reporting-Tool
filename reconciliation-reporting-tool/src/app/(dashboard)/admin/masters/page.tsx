"use client";

import { useEffect, useState } from "react";

type OpCo = { id: string; code: string; name: string; status: string };
type Partner = { id: string; code: string; name: string; status: string };
type Service = { id: string; code: string; name: string; status: string };

type Tab = "opcos" | "partners" | "services";

export default function AdminMastersPage() {
  const [tab, setTab] = useState<Tab>("opcos");
  const [error, setError] = useState<string | null>(null);

  const [opcos, setOpCos] = useState<OpCo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function load() {
    setError(null);
    try {
      const [o, p, s] = await Promise.all([
        fetch("/api/masters/opcos").then((r) => r.json()),
        fetch("/api/masters/partners").then((r) => r.json()),
        fetch("/api/masters/services").then((r) => r.json()),
      ]);
      if (o?.ok) setOpCos(o.opcos);
      if (p?.ok) setPartners(p.partners);
      if (s?.ok) setServices(s.services);
    } catch {
      setError("Failed to load masters");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const endpoint =
      tab === "opcos"
        ? "/api/masters/opcos"
        : tab === "partners"
          ? "/api/masters/partners"
          : "/api/masters/services";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message || "Failed to create");
        return;
      }
      setCode("");
      setName("");
      await load();
    } catch {
      setError("Network error");
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Masters</h1>
      <p className="text-sm text-zinc-600">Manage OpCos, Partners, Services.</p>

      <div className="pt-4">
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-md border px-3 py-1.5 text-sm ${
              tab === "opcos" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
            type="button"
            onClick={() => setTab("opcos")}
          >
            OpCos
          </button>
          <button
            className={`rounded-md border px-3 py-1.5 text-sm ${
              tab === "partners" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
            type="button"
            onClick={() => setTab("partners")}
          >
            Partners
          </button>
          <button
            className={`rounded-md border px-3 py-1.5 text-sm ${
              tab === "services" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
            type="button"
            onClick={() => setTab("services")}
          >
            Services
          </button>
          <button
            className="ml-auto rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50"
            type="button"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Create</h2>
            <form className="mt-4 space-y-3" onSubmit={create}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="code">
                    Code
                  </label>
                  <input
                    id="code"
                    className="h-10 w-full rounded-md border px-3 text-sm font-mono"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white"
              >
                Create
              </button>
            </form>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900">List</h2>
            <div className="mt-4 overflow-auto rounded-lg border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === "opcos"
                    ? opcos
                    : tab === "partners"
                      ? partners
                      : services
                  ).map((x) => (
                    <tr key={x.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{x.code}</td>
                      <td className="px-3 py-2">{x.name}</td>
                      <td className="px-3 py-2">{x.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

