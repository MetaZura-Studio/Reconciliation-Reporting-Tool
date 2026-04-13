import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/_utils/authz";

const CreateUserSchema = z.object({
  fullName: z.string().min(1).max(150),
  email: z.string().email(),
  mobile: z.string().max(20).optional().nullable(),
  role: z.enum(["ADMIN", "CLIENT", "OPCO", "PARTNER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED"]).default("ACTIVE"),
  temporaryPassword: z.string().min(8).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = CreateUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.temporaryPassword ?? "Temp@12345";
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        fullName: parsed.data.fullName,
        email,
        mobile: parsed.data.mobile ?? null,
        role: parsed.data.role,
        status: parsed.data.status,
        passwordHash,
        passwordChangedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user, temporaryPassword: password });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Email already exists" },
      { status: 409 },
    );
  }
}

