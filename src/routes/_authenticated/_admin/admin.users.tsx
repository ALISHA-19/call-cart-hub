import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers } from "@/lib/admin.functions";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const fn = useServerFn(adminListUsers);
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => fn() });
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="mt-6 space-y-3">
        {users.map((u: any) => (
          <div key={u.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{u.email}</div>
                <div className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString()} ·{" "}
                  {u.roles.join(", ") || "user"}
                </div>
              </div>
            </div>
            {u.subs.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {u.subs.map((s: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span>{s.apis?.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.remaining_calls} / {s.total_purchased}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
