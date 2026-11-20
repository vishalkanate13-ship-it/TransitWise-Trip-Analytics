import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="landing-topbar">
        <Link href="/" className="brand-link">
          <div className="brandicon">T</div>
          <div className="brand">
            Transit<span>Wise</span>
            <small>SMARTER CITY COMMUTES</small>
          </div>
        </Link>
        <nav className="landing-nav">
          <Link className="btn ghost small-btn" href="/login?mode=signup">Sign up</Link>
          <Link className="btn small-btn" href="/login">Sign in</Link>
          <Link className="text-link" style={{ marginLeft: 8 }} href="/admin/login">Admin</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR CITY · YOUR ROUTE · YOUR TIME</span>
          <h1>Make your commute <em>smarter.</em></h1>
          <p>
            Find a better public transport journey by comparing crowd levels,
            travel time, distance and transfers — all in one place.
          </p>
          <div className="hero-points">
            <span>✓ Crowd-aware suggestions</span>
            <span>✓ Real-time route ranking</span>
            <span>✓ Transfer timelines</span>
          </div>
          <div className="landing-actions">
            <Link className="landing-primary" href="/login?mode=signup">
              Get started free <span aria-hidden="true">→</span>
            </Link>
            <Link className="landing-secondary" href="/login">
              Already a passenger? Sign in
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="map-pin pin-a" />
          <div className="map-pin pin-b" />
          <div className="map-line" />
          <div className="bus-emoji">🚌</div>
        </div>
      </section>

      <section className="landing-features">
        <article className="feature-card">
          <div className="feature-icon">↗</div>
          <h2>Compare routes</h2>
          <p>Review journey time, distance, transfers and estimated fare before choosing a route.</p>
        </article>
        <article className="feature-card">
          <div className="feature-icon">◉</div>
          <h2>Check crowd levels</h2>
          <p>Compare recorded crowd readings to find a less crowded travel option.</p>
        </article>
        <article className="feature-card">
          <div className="feature-icon">⌖</div>
          <h2>Plan with confidence</h2>
          <p>Explore the sample transport network and its route information in one workspace.</p>
        </article>
      </section>

      <footer className="footer" style={{ margin: "0 40px 24px" }}>
        TransitWise · Crowd readings are demonstration and administrator-entered data, not a live BMTC feed.
      </footer>
    </main>
  );
}
