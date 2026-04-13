import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/generated/prisma";
import { AUTH } from "@/modules/auth/constants";

type SessionPayload = {
  sub: string;
  role: UserRole;
};

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_JWT_SECRET env var");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, expiresIn = "8h") {
  return await new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  const sub = payload.sub;
  const role = payload.role;
  if (typeof sub !== "string") throw new Error("Invalid session subject");
  if (
    role !== "ADMIN" &&
    role !== "CLIENT" &&
    role !== "OPCO" &&
    role !== "PARTNER"
  ) {
    throw new Error("Invalid session role");
  }
  return { sub, role };
}

export function getSessionCookieName() {
  return AUTH.sessionCookieName;
}

