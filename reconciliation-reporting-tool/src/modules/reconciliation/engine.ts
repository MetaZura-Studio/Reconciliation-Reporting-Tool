export type ReconciliationEntry = {
  reference: string;
  amount: number;
  meta?: unknown;
};

export type ReconciliationMatchResult =
  | {
      status: "MATCHED";
      reference: string;
      opcoAmount: number;
      partnerAmount: number;
      difference: number;
      meta?: unknown;
    }
  | {
      status: "MISMATCH";
      reference: string;
      opcoAmount: number;
      partnerAmount: number;
      difference: number;
      meta?: unknown;
    }
  | {
      status: "MISSING_IN_OPCO";
      reference: string;
      opcoAmount: null;
      partnerAmount: number;
      difference: number;
      meta?: unknown;
    }
  | {
      status: "MISSING_IN_PARTNER";
      reference: string;
      opcoAmount: number;
      partnerAmount: null;
      difference: number;
      meta?: unknown;
    };

export type ReconciliationEngineOptions = {
  amountTolerance?: number; // absolute tolerance
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function runMatchingEngine(
  opco: ReconciliationEntry[],
  partner: ReconciliationEntry[],
  opts: ReconciliationEngineOptions = {},
): ReconciliationMatchResult[] {
  const tol = opts.amountTolerance ?? 0.01;

  const opcoMap = new Map<string, ReconciliationEntry[]>();
  for (const e of opco) {
    const key = e.reference.trim();
    if (!key) continue;
    const arr = opcoMap.get(key) ?? [];
    arr.push(e);
    opcoMap.set(key, arr);
  }

  const partnerMap = new Map<string, ReconciliationEntry[]>();
  for (const e of partner) {
    const key = e.reference.trim();
    if (!key) continue;
    const arr = partnerMap.get(key) ?? [];
    arr.push(e);
    partnerMap.set(key, arr);
  }

  const refs = new Set<string>([...opcoMap.keys(), ...partnerMap.keys()]);
  const results: ReconciliationMatchResult[] = [];

  for (const ref of refs) {
    const o = opcoMap.get(ref) ?? [];
    const p = partnerMap.get(ref) ?? [];

    // Keep first entry per side for now (can be refined to 1:N matching later).
    const o0 = o[0];
    const p0 = p[0];

    if (!o0 && p0) {
      results.push({
        status: "MISSING_IN_OPCO",
        reference: ref,
        opcoAmount: null,
        partnerAmount: round2(p0.amount),
        difference: round2(p0.amount),
        meta: { partner: p0.meta },
      });
      continue;
    }

    if (o0 && !p0) {
      results.push({
        status: "MISSING_IN_PARTNER",
        reference: ref,
        opcoAmount: round2(o0.amount),
        partnerAmount: null,
        difference: round2(o0.amount),
        meta: { opco: o0.meta },
      });
      continue;
    }

    if (!o0 || !p0) continue;

    const diff = round2(o0.amount - p0.amount);
    if (Math.abs(diff) <= tol) {
      results.push({
        status: "MATCHED",
        reference: ref,
        opcoAmount: round2(o0.amount),
        partnerAmount: round2(p0.amount),
        difference: 0,
        meta: { opco: o0.meta, partner: p0.meta },
      });
    } else {
      results.push({
        status: "MISMATCH",
        reference: ref,
        opcoAmount: round2(o0.amount),
        partnerAmount: round2(p0.amount),
        difference: diff,
        meta: { opco: o0.meta, partner: p0.meta },
      });
    }
  }

  return results.sort((a, b) => a.reference.localeCompare(b.reference));
}

