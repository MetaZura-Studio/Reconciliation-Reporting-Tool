import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const PatchSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED"]).optional(),
  fullName: z.string().min(1).max(150).optional(),
  mobile: z.string().max(20).nullable().optional(),
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

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}

