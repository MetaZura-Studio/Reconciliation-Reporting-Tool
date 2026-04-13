import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const CreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  country: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  status: z.string().default("Active"),
  primaryContactName: z.string().optional().nullable(),
  primaryContactEmail: z.string().email().optional().nullable(),
  primaryContactPhone: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const opcos = await prisma.opCo.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, opcos });
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
    const opco = await prisma.opCo.create({ data: parsed.data });
    return NextResponse.json({ ok: true, opco });
  } catch {
    return NextResponse.json(
      { ok: false, message: "OpCo code must be unique" },
      { status: 409 },
    );
  }
}

