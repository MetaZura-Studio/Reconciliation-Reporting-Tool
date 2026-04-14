import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  canUseNewPassword,
  hashResetToken,
  isPasswordComplex,
  rotatePassword,
} from "@/modules/auth/password";

const BodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  newPassword: z.string().min(10),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  // Do not leak whether a user exists.
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, message: "Invalid token or expired" },
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

  const tokenHash = hashResetToken(parsed.data.token);
  const now = new Date();

  const reset = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
  if (!reset) {
    return NextResponse.json(
      { ok: false, message: "Invalid token or expired" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { lte: now },
      },
      data: { usedAt: now },
    }),
  ]);

  await rotatePassword({ userId: user.id, newPassword: parsed.data.newPassword });

  return NextResponse.json({ ok: true });
}

