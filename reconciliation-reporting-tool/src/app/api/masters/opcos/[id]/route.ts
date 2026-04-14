import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const PatchSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  country: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  status: z.string().optional(),
  primaryContactName: z.string().optional().nullable(),
  primaryContactEmail: z.string().email().optional().nullable(),
  primaryContactPhone: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const opco = await prisma.opCo.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.code ? { code: parsed.data.code.trim() } : {}),
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      },
    });
    return NextResponse.json({ ok: true, opco });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Update failed (code may need to be unique)" },
      { status: 400 },
    );
  }
}

