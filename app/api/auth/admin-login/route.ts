import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";
const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

// This endpoint is intentionally administrator-only.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid administrator email and password." }, { status: 400 });
    }

    const db = await sql();
    const [rows]: any = await db.query(
      "SELECT id,full_name,email,password_hash,role FROM app_users WHERE email=? AND role='ADMIN' LIMIT 1",
      [parsed.data.email.toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return NextResponse.json({ error: "Administrator email or password is incorrect." }, { status: 401 });
    }

    await createSession({
      id: Number(user.id),
      name: user.full_name,
      email: user.email,
      role: "ADMIN"
    });
    return NextResponse.json({ user: { name: user.full_name, email: user.email, role: "ADMIN" } });
  } catch (error) {
    console.error("Administrator login failed:", error);
    return NextResponse.json(
      { error: "Administrator sign-in service is unavailable. Check the database connection and app_users table." },
      { status: 503 }
    );
  }
}
