import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { signSession, getSessionCookieName } from "@/lib/auth";
import { verifyLogin } from "@/modules/auth/service";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  const result = await verifyLogin(parsed.data);
  if (!result.ok) {
    const message =
      result.code === "INACTIVE"
        ? "Your account is inactive"
        : result.code === "LOCKED"
          ? "Your account is locked. Contact administrator"
          : "Incorrect email or password";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  const token = await signSession({ sub: result.user.id, role: result.user.role });
  const jar = await cookies();
  jar.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.json({
    ok: true,
    user: result.user,
    redirectTo:
      result.user.role === "ADMIN"
        ? "/admin"
        : result.user.role === "OPCO"
          ? "/opco"
          : result.user.role === "PARTNER"
            ? "/partner"
            : "/client",
  });
}

