import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const passenger = await requirePassenger();
  if (!passenger) {
    return NextResponse.json({ error: "Passenger sign-in is required to access route planning." }, { status: 401 });
  }

  try {
    const db = await sql();
    const [stops] = await db.query("SELECT id, stop_name, area FROM stops ORDER BY stop_name");
    const [[stats]]: any = await db.query(`
      SELECT (SELECT COUNT(*) FROM routes WHERE active=1) routes,
             (SELECT COUNT(*) FROM stops) stops,
             (SELECT COUNT(*) FROM buses WHERE status='ACTIVE') buses,
             (SELECT COUNT(DISTINCT route_id) FROM crowding_summary c
               WHERE crowd_percent>=70 AND observed_at=(
                 SELECT MAX(c2.observed_at) FROM crowding_summary c2 WHERE c2.route_id=c.route_id
               )) highCrowd
    `);
    return NextResponse.json({ stops, stats });
  } catch (error) {
    console.error("Stop list failed:", error);
    return NextResponse.json({ error: "Could not load transport stops. Check the MySQL service and local database settings." }, { status: 503 });
  }
}
