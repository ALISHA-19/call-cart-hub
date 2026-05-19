import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listCatalog, buyApi } from "@/lib/marketplace.functions";
import { AppShell } from "@/components/AppShell";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/catalog")({
  component: Catalog,
});

function Catalog() {
  const qc = useQueryClient();
  const catalogFn = useServerFn(listCatalog);
  const buyFn = useServerFn(buyApi);
  const { data: apis = [] } = useQuery({ queryKey: ["catalog"], queryFn: () => catalogFn() });
  const [confirming, setConfirming] = useState<any>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const buy = useMutation({
    mutationFn: (apiId: string) => buyFn({ data: { apiId } }),
    onSuccess: (d) => {
      toast.success("API purchased — quota added");
      if (d.newApiKey) setNewKey(d.newApiKey);
      setConfirming(null);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Catalog</h1>
      <p className="mt-1 text-sm text-muted-foreground">Browse and purchase API quotas.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apis.map((a: any) => (
          <div key={a.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{a.name}</h3>
              <span className="rounded-md border border-border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {a.method}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.description}</p>
            <code className="mt-3 block rounded-md bg-background px-2 py-1 text-xs font-mono text-muted-foreground">
              /api/v1/{a.endpoint_slug}
            </code>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">₹{Number(a.price_per_pack)}</span>
              <span className="text-xs text-muted-foreground">/ {a.calls_per_pack} calls</span>
            </div>
            <button
              onClick={() => setConfirming(a)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4" />
              Buy
            </button>
          </div>
        ))}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold">Confirm purchase</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Buy {confirming.calls_per_pack} calls of <b>{confirming.name}</b> for ₹
              {Number(confirming.price_per_pack)}? (mock payment)
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => buy.mutate(confirming.id)}
                disabled={buy.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold">Your new API key</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Save this now — it will not be shown again.
            </p>
            <code className="mt-4 block break-all rounded-md border border-border bg-background p-3 font-mono text-sm">
              {newKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast.success("Copied");
              }}
              className="mt-4 w-full rounded-md border border-border px-4 py-2 text-sm"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              I saved it
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
