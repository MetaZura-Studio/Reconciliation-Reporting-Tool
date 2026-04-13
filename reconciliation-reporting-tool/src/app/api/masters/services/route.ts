import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const CreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  status: z.string().default("Active"),
  description: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, services });
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
    const service = await prisma.service.create({ data: parsed.data });
    return NextResponse.json({ ok: true, service });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Service code must be unique" },
      { status: 409 },
    );
  }
}

