import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePassenger } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
const schema = z.object({ routeId: z.number().int().positive() });

// A trip is counted only after a signed-in passenger explicitly records a completed journey.
export async function POST(request: NextRequest) {
  const passenger = await requirePassenger();
  if (!passenger) {
    return NextResponse.json({ error: "Passenger sign-in is required to record a journey." }, { status: 401 });
  }

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid route is required." }, { status: 400 });
    }

    const db = await sql();
    const [routeRows]: any = await db.query(
      "SELECT id, base_fare FROM routes WHERE id = ? AND active = 1 LIMIT 1",
      [parsed.data.routeId]
    );
    const route = routeRows[0];
    if (!route) {
      return NextResponse.json({ error: "The selected route is not currently available." }, { status: 404 });
    }

    const [result]: any = await db.execute(
      "INSERT INTO passenger_trips (passenger_id, route_id, travel_date, fare_paid) VALUES (?, ?, CURRENT_DATE(), ?)",
      [passenger.id, route.id, Number(route.base_fare)]
    );

    return NextResponse.json({
      ok: true,
      tripId: Number(result.insertId),
      message: "Completed journey recorded. It will be included in route performance insights."
    }, { status: 201 });
  } catch (error) {
    console.error("Trip recording failed:", error);
    return NextResponse.json({ error: "Could not record the journey. Please try again." }, { status: 503 });
  }
}
