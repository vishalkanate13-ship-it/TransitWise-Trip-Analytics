"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type AdminRoute = { id: number; route_code: string; route_name: string };
type AnalyticsRow = { route_code: string; route_name: string; trip_count: number; average_crowd: number };
type ActiveView = "crowd" | "analytics";

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const [view, setView] = useState<ActiveView>("crowd");
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [routeId, setRouteId] = useState("");
  const [crowd, setCrowd] = useState("40");
  const [status, setStatus] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [analyticsMsg, setAnalyticsMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/routes")
      .then((r) => r.json())
      .then((d) => {
        setRoutes(d.routes || []);
        if (d.routes?.length) setRouteId(String(d.routes[0].id));
      })
      .catch((e) => setStatus(e.message));
  }, []);

  async function saveCrowd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Updating crowd level…");
    try {
      const res = await fetch("/api/admin/crowding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: Number(routeId), crowdPercent: Number(crowd) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not update crowd level.");
      setStatus("Crowd level updated successfully.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not update crowd level.");
    }
  }

  async function loadAnalytics() {
    setAnalyticsMsg("Loading network insights…");
    try {
      const res = await fetch("/api/analytics/route");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not load analytics.");
      setAnalytics(d.analytics || []);
      setAnalyticsMsg(d.analytics?.length ? "" : "No trip history has been recorded yet.");
    } catch (err) {
      setAnalyticsMsg(err instanceof Error ? err.message : "Could not load analytics.");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const maxTrips = analytics.length ? Math.max(...analytics.map((r) => r.trip_count), 1) : 1;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Link href="/" className="brand-link">
            <div className="brandicon">T</div>
            <div className="brand">
              Transit<span>Wise</span>
              <small>NETWORK MANAGEMENT</small>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item${view === "crowd" ? " active" : ""}`}
            onClick={() => setView("crowd")}
          >
            <span className="sidebar-item-icon">📡</span>
            Crowd management
          </button>
          <button
            className={`sidebar-item${view === "analytics" ? " active" : ""}`}
            onClick={() => { setView("analytics"); if (!analytics.length) loadAnalytics(); }}
          >
            <span className="sidebar-item-icon">📊</span>
            Route analytics
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{adminName}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
          <button className="sidebar-item" onClick={signOut} style={{ marginTop: 6 }}>
            <span className="sidebar-item-icon">↩</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-page-title">
            {view === "crowd" ? "Crowd Management" : "Route Analytics"}
          </span>
          <span className="live-dot">● Authorized access</span>
        </header>

        <div className="admin-content">
          {/* Banner */}
          <div className="admin-banner">
            <div style={{ position: "relative", zIndex: 2 }}>
              <span className="eyebrow">ADMINISTRATOR WORKSPACE</span>
              <h1>Transport operations.</h1>
              <p>Manage network crowd levels and review route performance.</p>
            </div>
            <div className="admin-banner-icon" aria-hidden="true">◈</div>
          </div>

          {/* Crowd management view */}
          {view === "crowd" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow dark">CROWD MANAGEMENT</span>
                  <h2>Update route crowd level</h2>
                </div>
              </div>

              <form className="formgrid" onSubmit={saveCrowd} style={{ gridTemplateColumns: "1.4fr 1fr auto" }}>
                <div>
                  <label htmlFor="admin-route">Route</label>
                  <select
                    id="admin-route"
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    required
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>{r.route_code} · {r.route_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="crowd-value">Crowding % (0–100)</label>
                  <input
                    id="crowd-value"
                    type="number"
                    min="0" max="100"
                    value={crowd}
                    onChange={(e) => setCrowd(e.target.value)}
                    required
                  />
                </div>
                <button className="btn" disabled={!routes.length}>Update</button>
              </form>

              {status && (
                <p className={status.includes("successfully") ? "status-success" : "status-message"}>
                  {status}
                </p>
              )}
            </section>
          )}

          {/* Analytics view */}
          {view === "analytics" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow dark">NETWORK INSIGHTS</span>
                  <h2>Route performance</h2>
                </div>
                <button className="btn secondary small-btn" onClick={loadAnalytics}>
                  ↻ Refresh
                </button>
              </div>

              {analyticsMsg && <p className="muted" style={{ marginBottom: 16 }}>{analyticsMsg}</p>}

              {analytics.length > 0 && (
                <>
                  {/* Bar chart */}
                  <div style={{ marginBottom: 28 }}>
                    <div className="analytics-header">
                      <span>Route</span>
                      <span>Completed trips</span>
                      <span style={{ textAlign: "right" }}>Trips</span>
                      <span style={{ textAlign: "right" }}>Avg crowd</span>
                    </div>
                    <div className="analytics-bars">
                      {analytics.map((row) => (
                        <div className="analytics-row" key={row.route_code}>
                          <span className="analytics-label" title={`${row.route_code} · ${row.route_name}`}>
                            {row.route_code}
                          </span>
                          <div className="analytics-bar-track">
                            <div
                              className="analytics-bar-fill"
                              style={{ width: `${(row.trip_count / maxTrips) * 100}%` }}
                            />
                          </div>
                          <span className="analytics-val">{row.trip_count}</span>
                          <span className="analytics-crowd">{Number(row.average_crowd).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Route</th>
                          <th>Name</th>
                          <th>Completed trips</th>
                          <th>Average crowd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.map((row) => (
                          <tr key={row.route_code}>
                            <td><strong>{row.route_code}</strong></td>
                            <td>{row.route_name}</td>
                            <td>{row.trip_count}</td>
                            <td>{Number(row.average_crowd).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
                Completed trips increase when a signed-in passenger selects "Record completed trip" after travelling.
                Route searches alone are not counted.
              </p>
            </section>
          )}

          <footer className="footer">
            Administrator tools · Access is restricted to administrator accounts.
          </footer>
        </div>
      </div>
    </div>
  );
}
