import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const CreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  defaultCurrency: z.string().optional().nullable(),
  status: z.string().default("Active"),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const partners = await prisma.partner.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, partners });
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
    const partner = await prisma.partner.create({ data: parsed.data });
    return NextResponse.json({ ok: true, partner });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Partner code must be unique" },
      { status: 409 },
    );
  }
}

