import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/auth/session";

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { ok: true as const, user };
}

