import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a name, valid email and password (at least 8 characters)." },
        { status: 400 }
      );
    }

    const { fullName, email, password } = parsed.data;
    const db = await sql();
    const passwordHash = await bcrypt.hash(password, 12);

    let result: any;
    try {
      [result] = await db.execute(
        "INSERT INTO app_users(full_name,email,password_hash,role) VALUES(?,?,?,'PASSENGER')",
        [fullName, email.toLowerCase(), passwordHash]
      );
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
      }
      throw error;
    }

    const user = {
      id: Number(result.insertId),
      name: fullName,
      email: email.toLowerCase(),
      role: "PASSENGER" as const
    };
    await createSession(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration service unavailable. Check the database connection." }, { status: 503 });
  }
}
