"use client";

import { useEffect, useMemo, useState } from "react";

type OpCo = {
  id: string;
  code: string;
  name: string;
  status: string;
  country?: string | null;
  currency?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  remarks?: string | null;
};
type Partner = {
  id: string;
  code: string;
  name: string;
  status: string;
  defaultCurrency?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  remarks?: string | null;
};
type Service = {
  id: string;
  code: string;
  name: string;
  status: string;
  description?: string | null;
};
type PartnerServiceLink = {
  partnerId: string;
  serviceId: string;
  createdAt: string;
  partner: Partner;
  service: Service;
};

type Tab = "opcos" | "partners" | "services" | "partnerServices";

export default function AdminMastersPage() {
  const [tab, setTab] = useState<Tab>("opcos");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [opcos, setOpCos] = useState<OpCo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [links, setLinks] = useState<PartnerServiceLink[]>([]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");

  // OpCo extended fields
  const [opcoCountry, setOpCoCountry] = useState("");
  const [opcoCurrency, setOpCoCurrency] = useState("");
  const [opcoContactName, setOpCoContactName] = useState("");
  const [opcoContactEmail, setOpCoContactEmail] = useState("");
  const [opcoContactPhone, setOpCoContactPhone] = useState("");
  const [opcoRemarks, setOpCoRemarks] = useState("");

  // Partner extended fields
  const [partnerDefaultCurrency, setPartnerDefaultCurrency] = useState("");
  const [partnerContactName, setPartnerContactName] = useState("");
  const [partnerContactEmail, setPartnerContactEmail] = useState("");
  const [partnerContactPhone, setPartnerContactPhone] = useState("");
  const [partnerRemarks, setPartnerRemarks] = useState("");

  // Service extended fields
  const [serviceDescription, setServiceDescription] = useState("");

  const [linkPartnerId, setLinkPartnerId] = useState("");
  const [linkServiceId, setLinkServiceId] = useState("");

  const activeList = useMemo(() => {
    return tab === "opcos"
      ? opcos
      : tab === "partners"
        ? partners
        : services;
  }, [opcos, partners, services, tab]);

  async function load() {
    setError(null);
    try {
      const [o, p, s, l] = await Promise.all([
        fetch("/api/masters/opcos").then((r) => r.json()),
        fetch("/api/masters/partners").then((r) => r.json()),
        fetch("/api/masters/services").then((r) => r.json()),
        fetch("/api/masters/partner-services").then((r) => r.json()),
      ]);
      if (o?.ok) setOpCos(o.opcos);
      if (p?.ok) setPartners(p.partners);
      if (s?.ok) setServices(s.services);
      if (l?.ok) setLinks(l.links);
    } catch {
      setError("Failed to load masters");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (tab === "partnerServices") return;
    if (!selectedId && activeList.length > 0) setSelectedId(activeList[0]!.id);
  }, [activeList, selectedId, tab, opcos, partners, services]);

  useEffect(() => {
    if (tab === "partnerServices") return;
    const row =
      tab === "opcos"
        ? opcos.find((x) => x.id === selectedId)
        : tab === "partners"
          ? partners.find((x) => x.id === selectedId)
          : services.find((x) => x.id === selectedId);
    if (!row) return;
    setEditCode(row.code ?? "");
    setEditName(row.name ?? "");
    setEditStatus(row.status === "Inactive" ? "Inactive" : "Active");

    if (tab === "opcos") {
      const o = row as OpCo;
      setOpCoCountry(o.country ?? "");
      setOpCoCurrency(o.currency ?? "");
      setOpCoContactName(o.primaryContactName ?? "");
      setOpCoContactEmail(o.primaryContactEmail ?? "");
      setOpCoContactPhone(o.primaryContactPhone ?? "");
      setOpCoRemarks(o.remarks ?? "");
    } else if (tab === "partners") {
      const p = row as Partner;
      setPartnerDefaultCurrency(p.defaultCurrency ?? "");
      setPartnerContactName(p.contactName ?? "");
      setPartnerContactEmail(p.contactEmail ?? "");
      setPartnerContactPhone(p.contactPhone ?? "");
      setPartnerRemarks(p.remarks ?? "");
    } else {
      const s = row as Service;
      setServiceDescription(s.description ?? "");
    }
  }, [activeList, selectedId, tab, opcos, partners, services]);

  useEffect(() => {
    if (!linkPartnerId && partners.length > 0) setLinkPartnerId(partners[0]!.id);
  }, [linkPartnerId, partners]);

  useEffect(() => {
    if (!linkServiceId && services.length > 0) setLinkServiceId(services[0]!.id);
  }, [linkServiceId, services]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits() {
    if (!selectedId) return;
    setError(null);
    setBusy(true);
    const endpoint =
      tab === "opcos"
        ? `/api/masters/opcos/${selectedId}`
        : tab === "partners"
          ? `/api/masters/partners/${selectedId}`
          : `/api/masters/services/${selectedId}`;
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: editCode,
          name: editName,
          status: editStatus,
          ...(tab === "opcos"
            ? {
                country: opcoCountry || null,
                currency: opcoCurrency || null,
                primaryContactName: opcoContactName || null,
                primaryContactEmail: opcoContactEmail || null,
                primaryContactPhone: opcoContactPhone || null,
                remarks: opcoRemarks || null,
              }
            : {}),
          ...(tab === "partners"
            ? {
                defaultCurrency: partnerDefaultCurrency || null,
                contactName: partnerContactName || null,
                contactEmail: partnerContactEmail || null,
                contactPhone: partnerContactPhone || null,
                remarks: partnerRemarks || null,
              }
            : {}),
          ...(tab === "services"
            ? {
                description: serviceDescription || null,
              }
            : {}),
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!selectedId) return;
    const next = editStatus === "Active" ? "Inactive" : "Active";
    setEditStatus(next);
    await saveEdits();
  }

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/masters/partner-services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerId: linkPartnerId, serviceId: linkServiceId }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Create failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(partnerId: string, serviceId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/masters/partner-services", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerId, serviceId }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Remove failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Masters</h1>
      <p className="text-sm text-zinc-600">
        Manage OpCos, Partners, Services, and Partner↔Service associations.
      </p>

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
            className={`rounded-md border px-3 py-1.5 text-sm ${
              tab === "partnerServices" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
            type="button"
            onClick={() => setTab("partnerServices")}
          >
            Partner Services
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

        {tab === "partnerServices" ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Link partner to service</h2>
              <form className="mt-4 space-y-3" onSubmit={createLink}>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Partner</label>
                  <select
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={linkPartnerId}
                    onChange={(e) => setLinkPartnerId(e.target.value)}
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Service</label>
                  <select
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={linkServiceId}
                    onChange={(e) => setLinkServiceId(e.target.value)}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={busy || !linkPartnerId || !linkServiceId}
                  className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Create link"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Existing links</h2>
              <div className="mt-4 overflow-auto rounded-lg border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-600">
                    <tr>
                      <th className="px-3 py-2">Partner</th>
                      <th className="px-3 py-2">Service</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => (
                      <tr key={`${l.partnerId}:${l.serviceId}`} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">
                          {l.partner.code}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {l.service.code}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
                            disabled={busy}
                            onClick={() => void removeLink(l.partnerId, l.serviceId)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {links.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-sm text-zinc-600" colSpan={3}>
                          No links yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 lg:col-span-1">
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
                  disabled={busy}
                  className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  {busy ? "Creating..." : "Create"}
                </button>
              </form>

              <div className="mt-6 border-t pt-4">
                <h2 className="text-sm font-semibold text-zinc-900">Edit / Deactivate</h2>
                <div className="mt-3 space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Select</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                    >
                      {activeList.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.code} - {x.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Code</label>
                      <input
                        className="h-10 w-full rounded-md border px-3 text-sm font-mono"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Name</label>
                      <input
                        className="h-10 w-full rounded-md border px-3 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value as "Active" | "Inactive")
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <p className="text-xs text-zinc-600">
                      Use Active/Inactive to deactivate without deleting.
                    </p>
                  </div>

                  {tab === "opcos" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Country</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={opcoCountry}
                          onChange={(e) => setOpCoCountry(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Currency</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={opcoCurrency}
                          onChange={(e) => setOpCoCurrency(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Primary contact name</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={opcoContactName}
                          onChange={(e) => setOpCoContactName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Primary contact email</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={opcoContactEmail}
                          onChange={(e) => setOpCoContactEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Primary contact phone</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={opcoContactPhone}
                          onChange={(e) => setOpCoContactPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Remarks</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={opcoRemarks}
                          onChange={(e) => setOpCoRemarks(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}

                  {tab === "partners" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Default currency</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={partnerDefaultCurrency}
                          onChange={(e) => setPartnerDefaultCurrency(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Contact name</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={partnerContactName}
                          onChange={(e) => setPartnerContactName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Contact email</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={partnerContactEmail}
                          onChange={(e) => setPartnerContactEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Contact phone</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={partnerContactPhone}
                          onChange={(e) => setPartnerContactPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-sm font-medium">Remarks</label>
                        <input
                          className="h-10 w-full rounded-md border px-3 text-sm"
                          value={partnerRemarks}
                          onChange={(e) => setPartnerRemarks(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}

                  {tab === "services" ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Description</label>
                      <input
                        className="h-10 w-full rounded-md border px-3 text-sm"
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !selectedId}
                      className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
                      onClick={() => void saveEdits()}
                    >
                      {busy ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !selectedId}
                      className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
                      onClick={() => void toggleActive()}
                    >
                      Toggle Active/Inactive
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 lg:col-span-2">
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
                    {activeList.map((x) => (
                      <tr
                        key={x.id}
                        className={`border-t ${x.id === selectedId ? "bg-zinc-50" : ""}`}
                        onClick={() => setSelectedId(x.id)}
                      >
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
        )}
      </div>
    </div>
  );
}

