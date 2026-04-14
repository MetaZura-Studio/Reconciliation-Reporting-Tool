import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashResetToken, makeResetToken } from "@/modules/auth/password";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  // Always return ok to avoid account enumeration.
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ ok: true });
  }

  const token = makeResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
    select: { id: true },
  });

  // Email integration stub: log the token (do not do this in production).
  // The UI will accept token+email to complete reset.
  console.log(`[auth] password reset token for ${email}: ${token}`);

  return NextResponse.json({ ok: true });
}

