import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_utils/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    message: "Reconciliation API (stub)",
  });
}

