import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/api/_utils/requireUser";
import {
  canUseNewPassword,
  isPasswordComplex,
  rotatePassword,
} from "@/modules/auth/password";

const BodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { ok: false, message: "Current password is incorrect" },
      { status: 400 },
    );
  }

  if (!isPasswordComplex(parsed.data.newPassword)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Password must be at least 10 characters and include upper, lower, number, and special character",
      },
      { status: 400 },
    );
  }

  const reuse = await canUseNewPassword({
    userId: user.id,
    newPassword: parsed.data.newPassword,
    historyLimit: 5,
  });
  if (!reuse.ok) {
    return NextResponse.json(
      { ok: false, message: "You cannot reuse a recent password" },
      { status: 400 },
    );
  }

  await rotatePassword({ userId: user.id, newPassword: parsed.data.newPassword });
  return NextResponse.json({ ok: true });
}

