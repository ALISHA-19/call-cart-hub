import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminDashboard } from "@/lib/admin.functions";
import { AppShell, StatCard } from "@/components/AppShell";
import { Activity, DollarSign, Users, Server } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  component: AdminDash,
});

function AdminDash() {
  const fn = useServerFn(adminDashboard);
  const { data } = useQuery({ queryKey: ["admin-dash"], queryFn: () => fn() });
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Admin overview</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Calls today" value={data?.callsToday ?? 0} icon={Activity} />
        <StatCard label="Revenue (mock)" value={`₹${data?.revenue ?? 0}`} icon={DollarSign} />
        <StatCard label="Total users" value={data?.totalUsers ?? 0} icon={Users} />
        <StatCard label="APIs in catalog" value={data?.totalApis ?? 0} icon={Server} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Top APIs (7d)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(data?.topApis ?? []).map((a) => (
              <li key={a.name} className="flex justify-between">
                <span>{a.name}</span>
                <span className="font-mono text-muted-foreground">{a.count}</span>
              </li>
            ))}
            {(!data?.topApis || data.topApis.length === 0) && (
              <li className="text-muted-foreground">No data yet</li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Top users (7d)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(data?.topUsers ?? []).map((u) => (
              <li key={u.email} className="flex justify-between">
                <span>{u.email}</span>
                <span className="font-mono text-muted-foreground">{u.count}</span>
              </li>
            ))}
            {(!data?.topUsers || data.topUsers.length === 0) && (
              <li className="text-muted-foreground">No data yet</li>
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
