import bcrypt from "bcryptjs";
import type { User, UserRole, UserStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { AUTH } from "@/modules/auth/constants";

export type LoginResult =
  | { ok: true; user: Pick<User, "id" | "email" | "fullName" | "role"> }
  | { ok: false; code: "INVALID_CREDENTIALS" | "INACTIVE" | "LOCKED" };

export async function verifyLogin(params: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const email = params.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, code: "INVALID_CREDENTIALS" };
  if (user.status === ("INACTIVE" satisfies UserStatus))
    return { ok: false, code: "INACTIVE" };
  if (user.status === ("LOCKED" satisfies UserStatus))
    return { ok: false, code: "LOCKED" };

  const valid = await bcrypt.compare(params.password, user.passwordHash);
  if (!valid) {
    const nextFailed = user.failedLoginCount + 1;
    const threshold = Number(
      process.env.AUTH_LOCK_THRESHOLD ?? AUTH.failedLoginLockThreshold,
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextFailed,
        status: nextFailed >= threshold ? "LOCKED" : user.status,
        lockedAt: nextFailed >= threshold ? new Date() : user.lockedAt,
      },
    });
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedAt: null,
      lastLoginAt: new Date(),
    },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
    },
  };
}

