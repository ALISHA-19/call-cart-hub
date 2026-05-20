import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s) => ({
    mode:
      (s.mode as string) === "signup"
        ? "signup"
        : (s.mode as string) === "forgot"
          ? "forgot"
          : "login",
  }),
  component: LoginPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Too long")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[a-z]/, "Needs a lowercase letter")
  .regex(/[0-9]/, "Needs a number");

function scorePassword(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

function LoginPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const score = useMemo(() => scorePassword(password), [password]);
  const strengthLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][score];
  const strengthColor = [
    "bg-destructive",
    "bg-destructive",
    "bg-warning",
    "bg-primary",
    "bg-success",
  ][score];

  const validate = () => {
    const next: Record<string, string> = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0].message;
    if (isForgot) {
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    if (isSignup) {
      const p = passwordSchema.safeParse(password);
      if (!p.success) next.password = p.error.issues[0].message;
      if (password !== confirm) next.confirm = "Passwords do not match";
    } else {
      if (!password) next.password = "Required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/login",
        });
        if (error) throw error;
        toast.success("If that email exists, a reset link is on its way.");
        navigate({ to: "/login", search: { mode: "login" } });
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const title = isForgot ? "Reset password" : isSignup ? "Create account" : "Sign in";
  const subtitle = isForgot
    ? "We'll email you a reset link."
    : isSignup
      ? "Start buying API quotas."
      : "Welcome back.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <Zap className="h-5 w-5 text-primary" />
          API Marketplace
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${
                  errors.email ? "border-destructive" : "border-input"
                }`}
                required
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {!isForgot && (
              <div>
                <label className="text-sm text-muted-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${
                    errors.password ? "border-destructive" : "border-input"
                  }`}
                  required
                />
                {isSignup && password && (
                  <div className="mt-2">
                    <div className="flex h-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full ${
                            i < score ? strengthColor : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{strengthLabel}</p>
                  </div>
                )}
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            {isSignup && (
              <div>
                <label className="text-sm text-muted-foreground">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={!!errors.confirm}
                  className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${
                    errors.confirm ? "border-destructive" : "border-input"
                  }`}
                  required
                />
                {errors.confirm && (
                  <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : isForgot
                  ? "Send reset link"
                  : isSignup
                    ? "Create account"
                    : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            {!isForgot && !isSignup && (
              <Link
                to="/login"
                search={{ mode: "forgot" }}
                className="hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            )}
            <span className="ml-auto">
              {isSignup || isForgot ? (
                <Link to="/login" search={{ mode: "login" }} className="text-primary hover:underline">
                  Sign in
                </Link>
              ) : (
                <Link
                  to="/login"
                  search={{ mode: "signup" }}
                  className="text-primary hover:underline"
                >
                  Create account
                </Link>
              )}
            </span>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo credentials are in the project README.
        </p>
      </div>
    </div>
  );
}
