import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSessionCookieName, verifySession } from "@/lib/auth";

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(getSessionCookieName())?.value;
  if (!token) return null;

  try {
    const session = await verifySession(token);
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
    if (!user) return null;
    if (user.status !== "ACTIVE") return null;
    return user;
  } catch {
    return null;
  }
}

