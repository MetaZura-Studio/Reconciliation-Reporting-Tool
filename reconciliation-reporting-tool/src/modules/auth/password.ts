import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export function isPasswordComplex(pw: string) {
  // Simple, explicit complexity:
  // - >= 10 chars
  // - upper, lower, number, special
  return (
    pw.length >= 10 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^a-zA-Z0-9]/.test(pw)
  );
}

export function makeResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function canUseNewPassword(params: {
  userId: string;
  newPassword: string;
  historyLimit?: number;
}) {
  const historyLimit = params.historyLimit ?? 5;
  const recent = await prisma.passwordHistory.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    take: historyLimit,
    select: { passwordHash: true },
  });

  for (const h of recent) {
    const same = await bcrypt.compare(params.newPassword, h.passwordHash);
    if (same) return { ok: false as const, reason: "REUSE" as const };
  }
  return { ok: true as const };
}

export async function rotatePassword(params: {
  userId: string;
  newPassword: string;
}) {
  const newHash = await bcrypt.hash(params.newPassword, 12);
  await prisma.$transaction([
    prisma.passwordHistory.create({
      data: { userId: params.userId, passwordHash: newHash },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedAt: null,
        status: "ACTIVE",
      },
    }),
  ]);
}

