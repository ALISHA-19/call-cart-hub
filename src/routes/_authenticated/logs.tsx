import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { myLogs, listCatalog } from "@/lib/marketplace.functions";
import { AppShell, StatusBadge } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/logs")({
  component: Logs,
});

function Logs() {
  const logsFn = useServerFn(myLogs);
  const catalogFn = useServerFn(listCatalog);
  const [page, setPage] = useState(1);
  const [apiId, setApiId] = useState<string | "">("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: catalog = [] } = useQuery({ queryKey: ["catalog"], queryFn: () => catalogFn() });
  const { data } = useQuery({
    queryKey: ["my-logs", page, apiId, status, from, to],
    queryFn: () =>
      logsFn({
        data: {
          page,
          pageSize: 20,
          apiId: apiId || null,
          status: status ? Number(status) : null,
          from: from || null,
          to: to || null,
        },
      }),
  });
  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const exportCsv = () => {
    const header = ["Timestamp", "API", "Status", "Latency (ms)", "IP"];
    const lines = rows.map((l: any) =>
      [
        new Date(l.created_at).toISOString(),
        (l.apis?.name ?? l.api_slug ?? "").replace(/"/g, '""'),
        l.response_status,
        l.response_time_ms,
        l.ip_address ?? "",
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">My call logs</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={apiId}
          onChange={(e) => {
            setApiId(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All APIs</option>
          {catalog.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          <option value="200">200</option>
          <option value="401">401</option>
          <option value="403">403</option>
          <option value="404">404</option>
          <option value="429">429</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="ml-auto rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">API</th>
              <th className="p-3">Status</th>
              <th className="p-3">Latency</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l: any) => (
              <tr key={l.id} className="border-t border-border">
                <td className="p-3 text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="p-3">{l.apis?.name ?? l.api_slug}</td>
                <td className="p-3">
                  <StatusBadge status={l.response_status} />
                </td>
                <td className="p-3 font-mono">{l.response_time_ms}ms</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{l.ip_address}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No logs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} entries · page {page} / {pages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </AppShell>
  );
}
