import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getMe,
  mySubscriptions,
  myRecentLogs,
  myStats,
  regenerateKey,
  revealApiKey,
} from "@/lib/marketplace.functions";
import { AppShell, StatusBadge, StatCard } from "@/components/AppShell";
import {
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Activity,
  Server,
  BarChart3,
  Calendar,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const getMeFn = useServerFn(getMe);
  const subsFn = useServerFn(mySubscriptions);
  const logsFn = useServerFn(myRecentLogs);
  const statsFn = useServerFn(myStats);
  const regenFn = useServerFn(regenerateKey);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });
  const { data: subs = [] } = useQuery({ queryKey: ["my-subs"], queryFn: () => subsFn() });
  const { data: logs = [] } = useQuery({ queryKey: ["my-recent-logs"], queryFn: () => logsFn() });
  const { data: stats } = useQuery({ queryKey: ["my-stats"], queryFn: () => statsFn() });

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const regen = useMutation({
    mutationFn: () => regenFn(),
    onSuccess: (d) => {
      setRevealedKey(d.apiKey);
      setShow(true);
      toast.success("New API key generated — old key is now invalid");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copy = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    toast.success("Copied to clipboard");
  };

  const lowQuota = subs.filter((s: any) => {
    if (!s.total_purchased) return false;
    const used = 1 - s.remaining_calls / s.total_purchased;
    return used >= 0.9 && s.remaining_calls > 0;
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your API key and quota.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total calls" value={stats?.total ?? 0} icon={BarChart3} />
        <StatCard label="Calls today" value={stats?.today ?? 0} icon={Calendar} />
        <StatCard label="Active subscriptions" value={stats?.subs ?? 0} icon={ShoppingBag} />
      </div>

      {lowQuota.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
          <div>
            <p className="font-medium text-warning">Quota warning</p>
            <p className="text-muted-foreground">
              {lowQuota.map((s: any) => s.apis?.name).join(", ")} {lowQuota.length === 1 ? "is" : "are"}{" "}
              above 90% used. Top up to avoid disruption.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Key className="h-4 w-4 text-primary" />
          API Key
        </div>
        {revealedKey ? (
          <>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">
                {show ? revealedKey : "•".repeat(Math.min(revealedKey.length, 40))}
              </code>
              <button
                onClick={() => setShow((s) => !s)}
                className="rounded-md border border-border p-2 hover:bg-secondary"
                aria-label="Toggle visibility"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={copy}
                className="rounded-md border border-border p-2 hover:bg-secondary"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-warning">
              Save this key now — it will not be shown again.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {me?.hasApiKey
              ? "Your key is hidden for security. Regenerate to view a new one (old key invalidated)."
              : "You don't have a key yet. Buy an API or click Regenerate."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {me?.hasApiKey ? "Regenerate key" : "Generate key"}
          </button>
          <code className="rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-muted-foreground">
            curl -H "x-api-key: YOUR_KEY" /api/v1/&lt;slug&gt;
          </code>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Server className="h-4 w-4 text-primary" />
            Subscribed APIs
          </div>
          <Link
            to="/catalog"
            className="text-xs text-primary hover:underline"
          >
            Browse catalog →
          </Link>
        </div>
        {subs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No subscriptions yet.{" "}
            <Link to="/catalog" className="text-primary hover:underline">
              Browse the catalog
            </Link>{" "}
            to buy your first API.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {subs.map((s: any) => {
              const total = s.total_purchased || 1;
              const used = total - s.remaining_calls;
              const pct = Math.min(100, Math.round((s.remaining_calls / total) * 100));
              const barColor =
                pct < 10
                  ? "bg-destructive"
                  : pct < 25
                    ? "bg-warning"
                    : "bg-primary";
              return (
                <div key={s.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{s.apis?.name}</div>
                      <code className="text-xs text-muted-foreground">
                        /api/v1/{s.apis?.endpoint_slug}
                      </code>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">
                        {s.remaining_calls.toLocaleString()} / {total.toLocaleString()}
                      </span>
                      <StatusBadge status={s.remaining_calls > 0 ? 200 : 429} />
                      <Link
                        to="/catalog"
                        className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary"
                      >
                        Top up
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {used.toLocaleString()} used
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Recent activity
          </div>
          <Link to="/logs" className="text-xs text-primary hover:underline">
            View all logs →
          </Link>
        </div>
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No calls yet. Use your API key with{" "}
            <code className="font-mono">/api/v1/&lt;slug&gt;</code> to make your first call.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4">When</th>
                <th className="p-4">API</th>
                <th className="p-4">Status</th>
                <th className="p-4">Latency</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-4 text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">{l.apis?.name ?? l.api_slug}</td>
                  <td className="p-4">
                    <StatusBadge status={l.response_status} />
                  </td>
                  <td className="p-4 font-mono">{l.response_time_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
