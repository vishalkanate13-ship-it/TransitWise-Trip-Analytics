"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@transitwise.local");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus("Verifying administrator account…");
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Administrator sign-in failed.");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Administrator sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  const isLoading = status === "Verifying administrator account…";

  return (
    <main className="auth-page">
      {/* Left panel */}
      <div className="auth-side-panel" style={{ background: "linear-gradient(160deg, #060d1a 0%, #0d1f3c 50%, #0a2744 100%)" }}>
        <Link href="/" className="brand-link">
          <div className="brandicon">T</div>
          <div className="brand">
            Transit<span>Wise</span>
            <small>NETWORK MANAGEMENT</small>
          </div>
        </Link>
        <div className="auth-side-copy">
          <span className="eyebrow">ADMINISTRATOR PORTAL</span>
          <h1>Manage the network with clarity.</h1>
          <p>
            Maintain route crowding information and review transport
            network insights from the admin dashboard.
          </p>
        </div>
        <div className="auth-side-note">Restricted access · Authorized administrators only</div>
      </div>

      {/* Right card */}
      <section className="auth-card">
        <Link href="/" className="back-link">← Back to home</Link>
        <span className="eyebrow dark" style={{ marginTop: 24 }}>SECURE ADMIN ACCESS</span>
        <h2>Administrator sign in</h2>
        <p className="auth-subtitle">Use your administrator credentials to continue.</p>

        <form className="auth-form" onSubmit={submit} style={{ marginTop: 8 }}>
          <div>
            <label htmlFor="admin-email">Admin email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn auth-submit" disabled={busy}>
            {busy ? "Please wait…" : "Sign in to admin portal →"}
          </button>
        </form>

        {status && (
          <p className={isLoading ? "auth-status" : "auth-error"}>{status}</p>
        )}

        <p className="auth-footnote">
          Passenger account?{" "}
          <Link href="/login">Go to passenger sign in.</Link>
        </p>
      </section>
    </main>
  );
}
