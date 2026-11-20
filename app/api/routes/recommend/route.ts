
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql, mongo } from "@/lib/db";
import { scoreRoute, crowdLabel } from "@/lib/recommend";
import { requirePassenger } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  sourceStopId: z.number().int().positive(),
  destinationStopId: z.number().int().positive()
});

type StopRow = {
  stop_id: number;
  stop_name: string;
  stop_order: number;
  estimated_minutes_from_start: number;
};

type RouteRow = {
  id: number;
  route_code: string;
  route_name: string;
  duration_minutes: number;
  distance_km: number;
  base_fare: number;
  bus_number: string;
  capacity: number;
  stop_id: number;
  stop_name: string;
  stop_order: number;
  estimated_minutes_from_start: number;
};

type Leg = {
  route_id: number;
  route_code: string;
  route_name: string;
  bus_number: string;
  capacity: number;
  source_id: number;
  source_name: string;
  destination_id: number;
  destination_name: string;
  duration_minutes: number;
  distance_km: number;
  base_fare: number;
  crowd_percent: number;
  crowd_level: string;
};

export async function POST(req: NextRequest) {
  const passenger = await requirePassenger();

  if (!passenger) {
    return NextResponse.json(
      { error: "Sign in with a passenger account before searching routes." },
      { status: 401 }
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Select a valid source and destination." },
        { status: 400 }
      );
    }

    const { sourceStopId, destinationStopId } = parsed.data;

    if (sourceStopId === destinationStopId) {
      return NextResponse.json(
        { error: "Source and destination must be different." },
        { status: 400 }
      );
    }

    const db = await sql();

    const [rows]: any = await db.query(`
      SELECT
        r.id,
        r.route_code,
        r.route_name,
        r.duration_minutes,
        r.distance_km,
        r.base_fare,
        b.bus_number,
        b.capacity,
        rs.stop_id,
        s.stop_name,
        rs.stop_order,
        rs.estimated_minutes_from_start
      FROM routes r
      JOIN buses b ON b.id = r.bus_id
      JOIN route_stops rs ON rs.route_id = r.id
      JOIN stops s ON s.id = rs.stop_id
      WHERE r.active = 1
        AND b.status = 'ACTIVE'
      ORDER BY r.id, rs.stop_order
    `);

    const routeRows = rows as RouteRow[];
    const routeIds = [...new Set(routeRows.map(r => Number(r.id)))];

    if (!routeIds.length) {
      return NextResponse.json({
        routes: [],
        message: "No active bus routes are configured."
      });
    }

    // Get latest crowding observations from MongoDB.
    const database = await mongo();

    const latestMongo = await database
      .collection("crowding_observations")
      .aggregate([
        { $match: { route_id: { $in: routeIds } } },
        { $sort: { observed_at: -1 } },
        {
          $group: {
            _id: "$route_id",
            crowd_percent: { $first: "$crowd_percent" }
          }
        }
      ])
      .toArray();

    const crowdMap = new Map<number, number>();

    for (const item of latestMongo) {
      crowdMap.set(Number(item._id), Number(item.crowd_percent));
    }

    // Use MySQL crowding_summary when MongoDB has no observation.
    const placeholders = routeIds.map(() => "?").join(",");

    const [sqlCrowdRows]: any = await db.query(
      `SELECT c.route_id, c.crowd_percent
       FROM crowding_summary c
       JOIN (
         SELECT route_id, MAX(observed_at) AS latest
         FROM crowding_summary
         WHERE route_id IN (${placeholders})
         GROUP BY route_id
       ) latest
         ON latest.route_id = c.route_id
        AND latest.latest = c.observed_at`,
      routeIds
    );

    for (const item of sqlCrowdRows) {
      const id = Number(item.route_id);
      if (!crowdMap.has(id)) {
        crowdMap.set(id, Number(item.crowd_percent));
      }
    }

    // Load actual road distances between stop pairs.
    const [distanceRows]: any = await db.query(`
      SELECT from_stop_id, to_stop_id, road_distance_km
      FROM distance_matrix
    `);

    const distanceMap = new Map<string, number>();

    for (const item of distanceRows) {
      const key = `${item.from_stop_id}-${item.to_stop_id}`;
      distanceMap.set(key, Number(item.road_distance_km));
    }

    const stopNames = new Map<number, string>();

    for (const item of routeRows) {
      stopNames.set(Number(item.stop_id), item.stop_name);
    }

    type Edge = {
      from: number;
      to: number;
      leg: Leg;
    };

    const graph = new Map<number, Edge[]>();

    function addEdge(edge: Edge) {
      if (!graph.has(edge.from)) graph.set(edge.from, []);
      graph.get(edge.from)!.push(edge);
    }

    // Build travel options from every route's ordered stops.
    const grouped = new Map<number, RouteRow[]>();

    for (const item of routeRows) {
      const id = Number(item.id);
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id)!.push(item);
      stopNames.set(Number(item.stop_id), item.stop_name);
    }

    for (const [routeId, stops] of grouped) {
      stops.sort((a, b) => Number(a.stop_order) - Number(b.stop_order));

      const first = stops[0];
      const last = stops[stops.length - 1];

      if (!first || !last || stops.length < 2) continue;

      const crowd = crowdMap.get(routeId) ?? 50;
      const totalDuration = Number(first.duration_minutes);
      const totalDistance = Number(first.distance_km);

      // Support journeys between any two stops along a route.
      for (let i = 0; i < stops.length; i++) {
        for (let j = i + 1; j < stops.length; j++) {
          const a = stops[i];
          const b = stops[j];

          const from = Number(a.stop_id);
          const to = Number(b.stop_id);

          const minutes =
            Number(b.estimated_minutes_from_start) -
            Number(a.estimated_minutes_from_start);

          if (minutes <= 0) continue;

          const key = `${Math.min(from, to)}-${Math.max(from, to)}`;

          const distance =
            distanceMap.get(key) ??
            totalDistance * (minutes / totalDuration);

          const leg: Leg = {
            route_id: routeId,
            route_code: first.route_code,
            route_name: first.route_name,
            bus_number: first.bus_number,
            capacity: Number(first.capacity),
            source_id: from,
            source_name: a.stop_name,
            destination_id: to,
            destination_name: b.stop_name,
            duration_minutes: minutes,
            distance_km: distance,
            base_fare: Number(first.base_fare),
            crowd_percent: crowd,
            crowd_level: crowdLabel(crowd)
          };

          addEdge({ from, to, leg });

          // Existing route planner supports reverse directions.
          const reverseLeg: Leg = {
            ...leg,
            source_id: to,
            source_name: b.stop_name,
            destination_id: from,
            destination_name: a.stop_name
          };

          addEdge({ from: to, to: from, leg: reverseLeg });
        }
      }
    }

    // Search connected journeys, with at most 3 transfers.
    const candidates: Leg[][] = [];
    const maxLegs = 4;

    function search(
      current: number,
      path: Leg[],
      visitedStops: Set<number>,
      usedRoutes: Set<number>
    ) {
      if (candidates.length >= 300) return;

      if (current === destinationStopId && path.length > 0) {
        candidates.push([...path]);
        return;
      }

      if (path.length >= maxLegs) return;

      for (const edge of graph.get(current) ?? []) {
        if (visitedStops.has(edge.to)) continue;
        if (usedRoutes.has(edge.leg.route_id)) continue;

        const nextStops = new Set(visitedStops);
        nextStops.add(edge.to);

        const nextRoutes = new Set(usedRoutes);
        nextRoutes.add(edge.leg.route_id);

        search(
          edge.to,
          [...path, edge.leg],
          nextStops,
          nextRoutes
        );
      }
    }

    search(
      sourceStopId,
      [],
      new Set([sourceStopId]),
      new Set()
    );

    const recommendations = candidates.map(legs => {
      const duration = legs.reduce(
        (sum, leg) => sum + leg.duration_minutes, 0
      );

      const distance = legs.reduce(
        (sum, leg) => sum + leg.distance_km, 0
      );

      const fare = legs.reduce(
        (sum, leg) => sum + leg.base_fare, 0
      );

      const crowd = legs.reduce(
        (sum, leg) => sum + leg.crowd_percent, 0
      ) / legs.length;

      const transfers = legs.length - 1;

      const score = scoreRoute({
        crowd_percent: crowd,
        duration_minutes: duration,
        distance_km: distance,
        transfers
      });

      return {
        id: legs[0].route_id,
        route_code: legs.map(l => l.route_code).join(" + "),
        route_name: legs.map(l => l.route_name).join(" → "),
        source_name: legs[0].source_name,
        destination_name: legs[legs.length - 1].destination_name,
        duration_minutes: duration,
        distance_km: Math.round(distance * 100) / 100,
        transfers,
        base_fare: Math.round(fare * 100) / 100,
        bus_number: legs.map(l => l.bus_number).join(" → "),
        capacity: Math.min(...legs.map(l => l.capacity)),
        crowd_percent: Math.round(crowd),
        crowd_level: crowdLabel(crowd),
        score,
        reverse_direction: false,
        legs
      };
    });

    recommendations.sort((a, b) => a.score - b.score);

    return NextResponse.json({
      routes: recommendations.slice(0, 10),
      ranking:
        "Lower score is better. Crowd 55%, travel time 65%, distance 1.2 points/km, transfers 12 points each."
    });

  } catch (error) {
    console.error("Route recommendation failed:", error);

    return NextResponse.json(
      {
        error:
          "Route recommendation failed. Check MySQL and MongoDB connectivity."
      },
      { status: 503 }
    );
  }
}
