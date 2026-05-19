import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  beforeLoad: async () => {
    // Trigger one-time bootstrap (seeds admin + test user). Best-effort.
    if (typeof window !== "undefined") {
      fetch("/api/public/bootstrap").catch(() => {});
    }
  },
});

function Landing() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5 text-primary" />
            <span>API Marketplace</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {authed ? (
              <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-muted-foreground hover:text-foreground">
                  Sign in
                </Link>
                <Link to="/login" search={{ mode: "signup" }} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight">
          Buy, meter, and monitor APIs in real time.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A mini API gateway: list dummy APIs for sale, sell call quotas, and log every
          request with response times and status codes.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-border px-5 py-3 font-medium text-foreground hover:bg-secondary"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Hashed API keys", body: "SHA-256 stored, shown once, regenerate anytime." },
            { icon: Activity, title: "Atomic metering", body: "Quota check, decrement, and log in one transaction." },
            { icon: Zap, title: "Live dashboards", body: "Track calls, latency, top APIs, top users." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-border bg-card p-6 font-mono text-sm">
          <p className="text-muted-foreground"># Seeded demo accounts</p>
          <p className="mt-2">admin@marketplace.dev / Admin@123</p>
          <p>user@test.dev / User@123 (pre-subscribed to Weather API)</p>
        </div>
      </main>
    </div>
  );
}
