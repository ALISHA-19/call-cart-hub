import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  ScrollText,
  Server,
  Users,
  Activity,
  LogOut,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/marketplace.functions";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const getMeFn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });

  const userNav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/catalog", label: "Catalog", icon: ShoppingBag },
    { to: "/logs", label: "My logs", icon: ScrollText },
  ];
  const adminNav = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/apis", label: "APIs", icon: Server },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/logs", label: "All logs", icon: Activity },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 font-semibold">
          <Zap className="h-5 w-5 text-primary" />
          API Marketplace
        </div>
        <nav className="space-y-1 text-sm">
          <div className="px-2 pb-2 text-xs uppercase tracking-wider text-muted-foreground">User</div>
          {userNav.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={`flex items-center gap-2 rounded-md px-3 py-2 ${
                isActive(i.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <i.icon className="h-4 w-4" />
              {i.label}
            </Link>
          ))}
          {me?.isAdmin && (
            <>
              <div className="px-2 pb-2 pt-4 text-xs uppercase tracking-wider text-muted-foreground">
                Admin
              </div>
              {adminNav.map((i) => (
                <Link
                  key={i.to}
                  to={i.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive(i.to)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <i.icon className="h-4 w-4" />
                  {i.label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-4 text-xs">
          <div className="px-2 text-muted-foreground truncate">{me?.email}</div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: number }) {
  const cls =
    status >= 200 && status < 300
      ? "bg-success/15 text-success border-success/30"
      : status >= 400 && status < 500
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-warning/15 text-warning border-warning/30";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-mono ${cls}`}>
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}
