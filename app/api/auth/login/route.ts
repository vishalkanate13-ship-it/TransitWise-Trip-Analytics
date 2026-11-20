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

// This endpoint is intentionally passenger-only. Administrator sign-in has its own endpoint.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    const db = await sql();
    const [rows]: any = await db.query(
      "SELECT id,full_name,email,password_hash,role FROM app_users WHERE email=? LIMIT 1",
      [parsed.data.email.toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (user.role !== "PASSENGER") {
      return NextResponse.json({ error: "Administrator accounts must use the separate administrator portal." }, { status: 403 });
    }

    await createSession({
      id: Number(user.id),
      name: user.full_name,
      email: user.email,
      role: "PASSENGER"
    });
    return NextResponse.json({ user: { name: user.full_name, email: user.email, role: "PASSENGER" } });
  } catch (error) {
    console.error("Passenger login failed:", error);
    return NextResponse.json(
      { error: "Passenger sign-in service is unavailable. Check the database connection and app_users table." },
      { status: 503 }
    );
  }
}
