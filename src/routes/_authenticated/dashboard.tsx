import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getMe,
  mySubscriptions,
  myRecentLogs,
  regenerateKey,
} from "@/lib/marketplace.functions";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { Key, RefreshCw, Eye, EyeOff, Copy, Activity, Server } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const getMeFn = useServerFn(getMe);
  const subsFn = useServerFn(mySubscriptions);
  const logsFn = useServerFn(myRecentLogs);
  const regenFn = useServerFn(regenerateKey);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });
  const { data: subs = [] } = useQuery({ queryKey: ["my-subs"], queryFn: () => subsFn() });
  const { data: logs = [] } = useQuery({ queryKey: ["my-recent-logs"], queryFn: () => logsFn() });

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const regen = useMutation({
    mutationFn: () => regenFn(),
    onSuccess: (d) => {
      setRevealedKey(d.apiKey);
      setShow(true);
      toast.success("New API key generated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copy = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    toast.success("Copied to clipboard");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your API key and quota.</p>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Key className="h-4 w-4 text-primary" />
          API Key
        </div>
        {revealedKey ? (
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">
              {show ? revealedKey : "•".repeat(revealedKey.length)}
            </code>
            <button
              onClick={() => setShow((s) => !s)}
              className="rounded-md border border-border p-2 hover:bg-secondary"
              aria-label="Toggle"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={copy} className="rounded-md border border-border p-2 hover:bg-secondary">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {me?.hasApiKey
              ? "Your key is hidden for security. Regenerate to view a new one (old key invalidated)."
              : "You don't have a key yet. Buy an API or click Regenerate."}
          </p>
        )}
        <button
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate key
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4 text-sm font-semibold">
          <Server className="h-4 w-4 text-primary" />
          Subscribed APIs
        </div>
        {subs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No subscriptions yet. Browse the catalog to buy your first API.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4">API</th>
                <th className="p-4">Remaining</th>
                <th className="p-4">Total purchased</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-4 font-medium">{s.apis?.name}</td>
                  <td className="p-4 font-mono">{s.remaining_calls}</td>
                  <td className="p-4 font-mono text-muted-foreground">{s.total_purchased}</td>
                  <td className="p-4">
                    <StatusBadge status={s.remaining_calls > 0 ? 200 : 429} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4 text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          Recent activity
        </div>
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No calls yet.</p>
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
