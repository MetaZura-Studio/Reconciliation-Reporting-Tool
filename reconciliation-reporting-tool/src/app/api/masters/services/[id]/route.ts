import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const PatchSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  status: z.string().optional(),
  description: z.string().optional().nullable(),
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
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.code ? { code: parsed.data.code.trim() } : {}),
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      },
    });
    return NextResponse.json({ ok: true, service });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Update failed (code may need to be unique)" },
      { status: 400 },
    );
  }
}

