import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s) => ({ mode: (s.mode as string) === "signup" ? "signup" : "login" }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
});

function LoginPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <Zap className="h-5 w-5 text-primary" />
          API Marketplace
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{isSignup ? "Create account" : "Sign in"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Start buying API quotas." : "Welcome back."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link to="/login" search={{ mode: "login" }} className="text-primary hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/login" search={{ mode: "signup" }} className="text-primary hover:underline">
                  Create account
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="mt-6 rounded-md border border-border bg-card p-4 text-xs font-mono text-muted-foreground">
          <div>admin@marketplace.dev / Admin@123</div>
          <div>user@test.dev / User@123</div>
        </div>
      </div>
    </div>
  );
}
