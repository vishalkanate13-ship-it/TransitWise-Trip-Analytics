"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";

function PassengerAuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">(
    search.get("mode") === "login" ? "login" : "signup"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus(mode === "signup" ? "Creating your account…" : "Signing you in…");
    try {
      const res = await fetch(
        mode === "signup" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "signup"
              ? { fullName, email, password }
              : { email, password }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to authenticate.");
      if (data.user?.role !== "PASSENGER")
        throw new Error("This page is for passenger accounts. Use the administrator portal.");
      router.replace("/routes");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  }

  const isLoading = status === "Creating your account…" || status === "Signing you in…";

  return (
    <main className="auth-page">
      {/* Left panel */}
      <div className="auth-side-panel">
        <Link href="/" className="brand-link">
          <div className="brandicon">T</div>
          <div className="brand">
            Transit<span>Wise</span>
            <small>SMARTER CITY COMMUTES</small>
          </div>
        </Link>
        <div className="auth-side-copy">
          <span className="eyebrow">A BETTER WAY TO GET THERE</span>
          <h1>Your next journey starts here.</h1>
          <p>
            Sign in to compare route options and crowd levels across
            the TransitWise sample network.
          </p>
        </div>
        <div className="auth-side-note">Passenger access · Secure account login</div>
      </div>

      {/* Right card */}
      <section className="auth-card">
        <Link href="/" className="back-link">← Back to home</Link>
        <span className="eyebrow dark" style={{ marginTop: 24 }}>PASSENGER ACCOUNT</span>
        <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-subtitle">
          {mode === "signup"
            ? "Register to unlock route recommendations."
            : "Sign in to continue planning your journey."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => { setMode("signup"); setStatus(""); }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); setStatus(""); }}
          >
            Sign in
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                minLength={2} maxLength={100}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "signup" ? 8 : 1}
              maxLength={72}
              placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
              required
            />
          </div>
          <button className="btn auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
              ? "Create passenger account →"
              : "Sign in →"}
          </button>
        </form>

        {status && (
          <p className={isLoading ? "auth-status" : "auth-error"}>{status}</p>
        )}

        <p className="auth-footnote">
          Administrator?{" "}
          <Link href="/admin/login">Use the separate administrator portal.</Link>
        </p>
      </section>
    </main>
  );
}

export default function PassengerAuth() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-card">Loading…</section>
        </main>
      }
    >
      <PassengerAuthForm />
    </Suspense>
  );
}
