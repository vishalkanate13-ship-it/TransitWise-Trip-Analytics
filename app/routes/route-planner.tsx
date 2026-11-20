"use client";

import {
  getStops,
  recommendRoutes,
  recordCompletedTrip as recordCompletedTripAction,
  signOutPassenger,
} from "@/app/actions";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Stop = { id: number; stop_name: string; area: string };

type RouteLeg = {
  route_id: number;
  route_code: string;
  route_name: string;
  bus_number: string;
  from_stop: string;
  to_stop: string;
  duration_minutes: number;
};

type Route = {
  id: number;
  route_code: string;
  route_name: string;
  source_name: string;
  destination_name: string;
  duration_minutes: number;
  distance_km: number | null;
  transfers: number;
  base_fare: number;
  crowd_percent: number;
  crowd_level: string;
  score: number;
  bus_number: string;
  capacity: number;
  legs?: RouteLeg[];
};

type Stats = { routes: number; stops: number; buses: number; highCrowd: number };

export default function RoutePlanner({ passengerName }: { passengerName: string }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stats, setStats] = useState<Stats>({ routes: 0, stops: 0, buses: 0, highCrowd: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Select your starting point and destination to compare available journeys.");
  const [tripBusy, setTripBusy] = useState<number | null>(null);
  const [recordedTrips, setRecordedTrips] = useState<Record<number, string>>({});
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getStops();
        if (!data || !Array.isArray(data.stops)) throw new Error("Could not load stops.");
        setStops(data.stops);
        setStats(data.stats);
        if (data.stops.length > 1) {
          setSource(String(data.stops[0].id));
          setDestination(String(data.stops[1].id));
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Could not load stops.");
      }
    }
    load();
  }, []);

  async function recommend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!source || !destination) { setMessage("Please select both starting point and destination."); return; }
    if (source === destination) { setMessage("Starting point and destination must be different."); return; }
    setLoading(true);
    setRoutes([]);
    setMessage("");
    try {
      const data = await recommendRoutes(Number(source), Number(destination));
      if (!data || !Array.isArray(data.routes)) throw new Error("Invalid route search response.");
      setRoutes(data.routes);
      setMessage(
        data.routes.length
          ? `Found ${data.routes.length} route option${data.routes.length === 1 ? "" : "s"}. Lower scores indicate a better match.`
          : "No route available for this pair. Try another combination."
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Route search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function recordCompletedTrip(route: Route) {
    const confirmed = window.confirm(
      `Record that you completed ${route.route_name}? This will be included in network popularity insights.`
    );
    if (!confirmed) return;
    setTripBusy(route.id);
    setRecordedTrips((c) => ({ ...c, [route.id]: "Saving journey…" }));
    try {
      await recordCompletedTripAction(route.id);
      setRecordedTrips((c) => ({ ...c, [route.id]: "Completed journey recorded" }));
    } catch (err) {
      setRecordedTrips((c) => ({ ...c, [route.id]: err instanceof Error ? err.message : "Could not record this journey." }));
    } finally {
      setTripBusy(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await signOutPassenger();
      window.location.href = "/";
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const crowdLevel = (level: string) => (level || "moderate").toLowerCase() as "low" | "moderate" | "high";

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <Link href="/" className="brand-link">
          <div className="brandicon">T</div>
          <div className="brand">
            Transit<span>Wise</span>
            <small>SMARTER CITY COMMUTES</small>
          </div>
        </Link>
        <div className="top-actions">
          <span className="welcome-user">👋 {passengerName.split(" ")[0]}</span>
          <button className="btn ghost small-btn" onClick={signOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <div className="page-body">
        {/* Banner */}
        <section className="workspace-banner">
          <div>
            <span className="eyebrow">PASSENGER WORKSPACE</span>
            <h1>Plan your next journey.</h1>
            <p>Compare routes using crowd levels, travel time, distance and transfers.</p>
          </div>
          <div className="workspace-bus" aria-hidden="true">🚌</div>
        </section>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-icon">🛣️</div>
            <small>Active routes</small>
            <strong>{stats.routes}</strong>
            <span className="stat-foot">Available in network</span>
          </div>
          <div className="stat">
            <div className="stat-icon">📍</div>
            <small>Transport stops</small>
            <strong>{stats.stops}</strong>
            <span className="stat-foot">Across service areas</span>
          </div>
          <div className="stat">
            <div className="stat-icon">🚌</div>
            <small>Registered buses</small>
            <strong>{stats.buses}</strong>
            <span className="stat-foot">In sample fleet</span>
          </div>
          <div className="stat">
            <div className="stat-icon">🔴</div>
            <small>High-crowd routes</small>
            <strong>{stats.highCrowd}</strong>
            <span className="stat-foot">Latest recorded readings</span>
          </div>
        </div>

        {/* Route finder */}
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow dark">ROUTE FINDER</span>
              <h2>Find the best route</h2>
            </div>
            <span className="live-dot">● Sample network</span>
          </div>

          <form className="formgrid" onSubmit={recommend}>
            <div>
              <label htmlFor="source">From</label>
              <select id="source" value={source} onChange={(e) => setSource(e.target.value)} required>
                <option value="">Select starting stop</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id}>{s.stop_name} · {s.area}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="destination">To</label>
              <select id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} required>
                <option value="">Select destination</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id}>{s.stop_name} · {s.area}</option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit" disabled={loading || !source || !destination}>
              {loading ? "Searching…" : "Find routes →"}
            </button>
          </form>

          {message && <p className="feedback">{message}</p>}

          {/* Route results */}
          <div className="results">
            {routes.map((route, index) => {
              const cl = crowdLevel(route.crowd_level);
              const recorded = recordedTrips[route.id] === "Completed journey recorded";
              return (
                <article className={`route-card${index === 0 ? " best" : ""}`} key={`${route.id}-${index}`}>
                  {/* Card header */}
                  <div className="route-card-header">
                    <div>
                      <span className={`route-kicker${index !== 0 ? " alt" : ""}`}>
                        {index === 0 ? "★ BEST MATCH" : `ALTERNATIVE ${index}`}
                      </span>
                      <h3>{route.route_name}</h3>
                      <p className="route-meta">{route.route_code} · Bus {route.bus_number} · Capacity {route.capacity}</p>
                      <div className="route-direction">
                        <span>{route.source_name}</span>
                        <span className="route-direction-arrow">→</span>
                        <span>{route.destination_name}</span>
                      </div>
                    </div>
                    <span className={`crowd ${cl}`}>{route.crowd_level} · {route.crowd_percent}%</span>
                  </div>

                  {/* Crowd bar */}
                  <div className="crowd-bar-wrap">
                    <div className="crowd-bar-track">
                      <div className={`crowd-bar-fill ${cl}`} style={{ width: `${route.crowd_percent}%` }} />
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="route-metrics">
                    <div className="metric">
                      <small>Travel time</small>
                      <strong>{route.duration_minutes} min</strong>
                    </div>
                    <div className="metric">
                      <small>Distance</small>
                      <strong>
                        {route.distance_km != null
                          ? `${Number(route.distance_km).toFixed(2)} km`
                          : "—"}
                      </strong>
                    </div>
                    <div className="metric">
                      <small>Transfers</small>
                      <strong>{route.transfers}</strong>
                    </div>
                    <div className="metric">
                      <small>Est. fare</small>
                      <strong>₹{Number(route.base_fare).toFixed(0)}</strong>
                    </div>
                    <div className="trip-action">
                      <button
                        type="button"
                        className={`btn small-btn${recorded ? " secondary" : ""}`}
                        onClick={() => recordCompletedTrip(route)}
                        disabled={tripBusy === route.id || recorded}
                      >
                        {tripBusy === route.id ? "Saving…" : recorded ? "Trip recorded ✓" : "Record trip"}
                      </button>
                      <small className={recorded ? "trip-success" : "trip-help"}>
                        {recordedTrips[route.id] || "After you have travelled"}
                      </small>
                    </div>
                  </div>

                  {/* Journey legs timeline */}
                  {route.legs && route.legs.length > 0 && (
                    <details className="journey-details">
                      <summary>
                        Journey details ({route.legs.length} leg{route.legs.length === 1 ? "" : "s"})
                      </summary>
                      <ol className="journey-legs">
                        {route.legs.map((leg, li) => (
                          <li key={`${leg.route_id}-${li}`}>
                            <strong>Bus {leg.bus_number}</strong>
                            <span>{leg.from_stop} → {leg.to_stop}</span>
                            <small>{leg.route_code} · {leg.duration_minutes} min</small>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <footer className="footer">
          TransitWise · Crowd readings are demonstration and administrator-entered data, not a live BMTC feed.
        </footer>
      </div>
    </div>
  );
}
