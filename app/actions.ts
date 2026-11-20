
"use server";

import { cookies } from "next/headers";
import { sql, mongo } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { scoreRoute, crowdLabel } from "@/lib/recommend";

type RouteRow = {
  id: number;
  route_code: string;
  route_name: string;
  duration_minutes: number;
  distance_km: number;
  base_fare: number;
  transfers: number;
  bus_number: string;
  capacity: number;
};

type RouteStopRow = {
  route_id: number;
  route_code: string;
  route_name: string;
  duration_minutes: number;
  base_fare: number;
  bus_number: string;
  capacity: number;
  stop_id: number;
  stop_name: string;
  stop_order: number;
  estimated_minutes_from_start: number;
};

type Edge = {
  route: RouteRow;
  fromId: number;
  toId: number;
  fromName: string;
  toName: string;
  duration: number;
};

export async function getStops() {
  const passenger = await requirePassenger();

  if (!passenger) {
    throw new Error("Passenger login required");
  }

  const db = await sql();

  const [stops]: any = await db.query(`
    SELECT id, stop_name, area
    FROM stops
    ORDER BY stop_name
  `);

  const [[stats]]: any = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM routes WHERE active = 1) AS routes,
      (SELECT COUNT(*) FROM stops) AS stops,
      (SELECT COUNT(*) FROM buses WHERE status = 'ACTIVE') AS buses,
      (SELECT COUNT(DISTINCT route_id)
       FROM crowding_summary
       WHERE crowd_percent >= 70) AS highCrowd
  `);

  return {
    stops,
    stats: {
      routes: Number(stats.routes),
      stops: Number(stats.stops),
      buses: Number(stats.buses),
      highCrowd: Number(stats.highCrowd),
    },
  };
}

export async function recommendRoutes(
  sourceStopId: number,
  destinationStopId: number
) {
  const passenger = await requirePassenger();

  if (!passenger) {
    throw new Error("Passenger login required");
  }

  if (
    !Number.isInteger(sourceStopId) ||
    !Number.isInteger(destinationStopId) ||
    sourceStopId <= 0 ||
    destinationStopId <= 0 ||
    sourceStopId === destinationStopId
  ) {
    throw new Error("Select valid and different stops");
  }

  const db = await sql();

  const [[sourceStop]]: any = await db.query(
    "SELECT id, stop_name FROM stops WHERE id = ?",
    [sourceStopId]
  );

  const [[destinationStop]]: any = await db.query(
    "SELECT id, stop_name FROM stops WHERE id = ?",
    [destinationStopId]
  );

  if (!sourceStop || !destinationStop) {
    throw new Error("Selected stop does not exist");
  }

  const [routeRows]: any = await db.query(`
    SELECT
      r.id,
      r.route_code,
      r.route_name,
      r.duration_minutes,
      r.distance_km,
      r.base_fare,
      r.transfers,
      b.bus_number,
      b.capacity
    FROM routes r
    INNER JOIN buses b ON b.id = r.bus_id
    WHERE r.active = 1
      AND b.status = 'ACTIVE'
  `);

  const [routeStopRows]: any = await db.query(`
    SELECT
      r.id AS route_id,
      r.route_code,
      r.route_name,
      r.duration_minutes,
      r.base_fare,
      b.bus_number,
      b.capacity,
      rs.stop_id,
      s.stop_name,
      rs.stop_order,
      rs.estimated_minutes_from_start
    FROM routes r
    INNER JOIN buses b ON b.id = r.bus_id
    INNER JOIN route_stops rs ON rs.route_id = r.id
    INNER JOIN stops s ON s.id = rs.stop_id
    WHERE r.active = 1
      AND b.status = 'ACTIVE'
    ORDER BY r.id, rs.stop_order
  `);

  if (!routeRows.length || !routeStopRows.length) {
    return { routes: [] };
  }

  const database = await mongo();

  const routeIds = routeRows.map((route: any) => Number(route.id));

  const readings = await database
    .collection("crowding_observations")
    .aggregate([
      {
        $match: {
          route_id: { $in: routeIds },
        },
      },
      {
        $sort: {
          observed_at: -1,
        },
      },
      {
        $group: {
          _id: "$route_id",
          crowd_percent: {
            $first: "$crowd_percent",
          },
        },
      },
    ])
    .toArray();

  const crowdMap = new Map<number, number>(
    readings.map((reading: any) => [
      Number(reading._id),
      Number(reading.crowd_percent),
    ])
  );

  const routeMap = new Map<number, RouteRow>();

  for (const row of routeRows) {
    routeMap.set(Number(row.id), {
      ...row,
      id: Number(row.id),
      duration_minutes: Number(row.duration_minutes),
      distance_km: Number(row.distance_km),
      base_fare: Number(row.base_fare),
      transfers: Number(row.transfers),
      capacity: Number(row.capacity),
    });
  }

  const groupedStops = new Map<number, RouteStopRow[]>();

  for (const row of routeStopRows as RouteStopRow[]) {
    const routeId = Number(row.route_id);

    if (!groupedStops.has(routeId)) {
      groupedStops.set(routeId, []);
    }

    groupedStops.get(routeId)!.push(row);
  }

  const adjacency = new Map<number, Edge[]>();

  function addEdge(edge: Edge) {
    if (!adjacency.has(edge.fromId)) {
      adjacency.set(edge.fromId, []);
    }

    adjacency.get(edge.fromId)!.push(edge);
  }

  // Create edges between every pair of stops on the same route.
  // This allows passengers to remain on the same bus across
  // multiple intermediate stops without counting them as transfers.
  for (const [routeId, routeStops] of groupedStops) {
    const route = routeMap.get(routeId);

    if (!route || routeStops.length < 2) {
      continue;
    }

    routeStops.sort(
      (a, b) => Number(a.stop_order) - Number(b.stop_order)
    );

    for (let i = 0; i < routeStops.length; i++) {
      for (let j = i + 1; j < routeStops.length; j++) {
        const from = routeStops[i];
        const to = routeStops[j];

        const fromMinutes = Number(
          from.estimated_minutes_from_start ?? 0
        );

        const toMinutes = Number(
          to.estimated_minutes_from_start ?? 0
        );

        const duration = Math.max(0, toMinutes - fromMinutes);

        addEdge({
          route,
          fromId: Number(from.stop_id),
          toId: Number(to.stop_id),
          fromName: from.stop_name,
          toName: to.stop_name,
          duration,
        });

        addEdge({
          route,
          fromId: Number(to.stop_id),
          toId: Number(from.stop_id),
          fromName: to.stop_name,
          toName: from.stop_name,
          duration,
        });
      }
    }
  }

  const paths: Edge[][] = [];

  function searchPaths(
    currentStop: number,
    visitedStops: Set<number>,
    usedRoutes: Set<number>,
    currentPath: Edge[]
  ) {
    if (paths.length >= 100) return;

    if (currentStop === destinationStopId) {
      if (currentPath.length > 0) {
        paths.push([...currentPath]);
      }
      return;
    }

    if (currentPath.length >= 4) return;

    const nextEdges = adjacency.get(currentStop) ?? [];

    for (const edge of nextEdges) {
      if (visitedStops.has(edge.toId)) continue;
      if (usedRoutes.has(edge.route.id)) continue;

      const nextVisited = new Set(visitedStops);
      nextVisited.add(edge.toId);

      const nextUsedRoutes = new Set(usedRoutes);
      nextUsedRoutes.add(edge.route.id);

      searchPaths(
        edge.toId,
        nextVisited,
        nextUsedRoutes,
        [...currentPath, edge]
      );
    }
  }

  searchPaths(
    sourceStopId,
    new Set([sourceStopId]),
    new Set(),
    []
  );

  if (paths.length === 0) {
    return { routes: [] };
  }

  const [distanceRows]: any = await db.query(
    `
      SELECT road_distance_km
      FROM distance_matrix
      WHERE
        (from_stop_id = ? AND to_stop_id = ?)
        OR
        (from_stop_id = ? AND to_stop_id = ?)
      LIMIT 1
    `,
    [
      sourceStopId,
      destinationStopId,
      destinationStopId,
      sourceStopId,
    ]
  );

  const journeyDistance =
    distanceRows.length > 0 &&
    distanceRows[0].road_distance_km !== null
      ? Number(distanceRows[0].road_distance_km)
      : null;

  const results = paths.map((path) => {
    const uniqueRoutes = Array.from(
      new Map(
        path.map((edge) => [edge.route.id, edge.route])
      ).values()
    );

    const transfers = Math.max(0, uniqueRoutes.length - 1);

    const crowdValues = uniqueRoutes.map(
      (route) => crowdMap.get(route.id) ?? 50
    );

    const averageCrowd =
      crowdValues.reduce((sum, value) => sum + value, 0) /
      crowdValues.length;

    const estimatedDuration = path.reduce(
      (sum, edge) => sum + edge.duration,
      0
    );

    const totalFare = uniqueRoutes.reduce(
      (sum, route) => sum + route.base_fare,
      0
    );

    // Used only for recommendation scoring, not displayed distance.
    const routeDistanceForScoring = uniqueRoutes.reduce(
      (sum, route) => sum + route.distance_km,
      0
    );

    const score = scoreRoute({
      crowd_percent: averageCrowd,
      duration_minutes: estimatedDuration,
      distance_km: routeDistanceForScoring,
      transfers,
    });

    return {
      id: uniqueRoutes[0].id,
      route_code: uniqueRoutes
        .map((route) => route.route_code)
        .join(" + "),
      route_name: `${sourceStop.stop_name} → ${destinationStop.stop_name}`,
      source_name: sourceStop.stop_name,
      destination_name: destinationStop.stop_name,
      duration_minutes: estimatedDuration,
      distance_km: journeyDistance,
      transfers,
      base_fare: totalFare,
      crowd_percent: Math.round(averageCrowd),
      crowd_level: crowdLabel(averageCrowd),
      score,
      bus_number: uniqueRoutes
        .map((route) => route.bus_number)
        .join(" → "),
      capacity: Math.min(
        ...uniqueRoutes.map((route) => route.capacity)
      ),
      legs: path.map((edge) => ({
        route_id: edge.route.id,
        route_code: edge.route.route_code,
        route_name: edge.route.route_name,
        bus_number: edge.route.bus_number,
        from_stop: edge.fromName,
        to_stop: edge.toName,
        duration_minutes: edge.duration,
      })),
      journey_distance_available: journeyDistance !== null,
    };
  });

  results.sort((a, b) => a.score - b.score);

  return {
    routes: results.slice(0, 10),
  };
}

export async function recordCompletedTrip(routeId: number) {
  const passenger = await requirePassenger();

  if (!passenger) {
    throw new Error("Passenger sign-in is required to record a journey.");
  }

  if (!Number.isInteger(routeId) || routeId <= 0) {
    throw new Error("A valid route is required.");
  }

  const db = await sql();

  const [routeRows]: any = await db.query(
    `
      SELECT id, base_fare
      FROM routes
      WHERE id = ? AND active = 1
      LIMIT 1
    `,
    [routeId]
  );

  const route = routeRows[0];

  if (!route) {
    throw new Error("The selected route is not currently available.");
  }

  const [result]: any = await db.execute(
    `
      INSERT INTO passenger_trips
        (passenger_id, route_id, travel_date, fare_paid)
      VALUES (?, ?, CURRENT_DATE(), ?)
    `,
    [passenger.id, route.id, Number(route.base_fare)]
  );

  return {
    ok: true,
    tripId: Number(result.insertId),
    message:
      "Completed journey recorded. It will be included in route performance insights.",
  };
}

export async function signOutPassenger() {
  const jar = await cookies();
  jar.delete("transit_session");

  return { ok: true };
}
