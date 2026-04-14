import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const PatchSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  defaultCurrency: z.string().optional().nullable(),
  status: z.string().optional(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
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
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.code ? { code: parsed.data.code.trim() } : {}),
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      },
    });
    return NextResponse.json({ ok: true, partner });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Update failed (code may need to be unique)" },
      { status: 400 },
    );
  }
}

