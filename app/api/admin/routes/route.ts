import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator sign-in is required." }, { status: 401 });
  try {
    const db = await sql();
    const [routes] = await db.query(
      "SELECT id, route_code, route_name FROM routes WHERE active=1 ORDER BY route_code"
    );
    return NextResponse.json({ routes });
  } catch (error) {
    console.error("Admin route list failed:", error);
    return NextResponse.json({ error: "Could not load active routes." }, { status: 503 });
  }
}
