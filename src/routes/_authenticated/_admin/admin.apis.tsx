import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListApis,
  adminCreateApi,
  adminUpdateApi,
  adminDeleteApi,
} from "@/lib/admin.functions";
import { AppShell } from "@/components/AppShell";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/apis")({
  component: AdminApis,
});

type Form = {
  name: string;
  description: string;
  endpoint_slug: string;
  method: "GET" | "POST";
  price_per_pack: number;
  calls_per_pack: number;
  dummy_response: string;
};

const empty: Form = {
  name: "",
  description: "",
  endpoint_slug: "",
  method: "GET",
  price_per_pack: 100,
  calls_per_pack: 1000,
  dummy_response: "{}",
};

function AdminApis() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListApis);
  const createFn = useServerFn(adminCreateApi);
  const updateFn = useServerFn(adminUpdateApi);
  const deleteFn = useServerFn(adminDeleteApi);
  const { data: apis = [] } = useQuery({ queryKey: ["admin-apis"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const f = editing.form;
      let dummy;
      try {
        dummy = JSON.parse(f.dummy_response);
      } catch {
        throw new Error("Dummy response must be valid JSON");
      }
      const payload = { ...f, dummy_response: dummy };
      if (editing.id) {
        await updateFn({ data: { id: editing.id, patch: payload } });
      } else {
        await createFn({ data: payload });
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-apis"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-apis"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">APIs</h1>
        <button
          onClick={() => setEditing({ form: empty })}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New API
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Method</th>
              <th className="p-3">Price</th>
              <th className="p-3">Calls/pack</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {apis.map((a: any) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3 font-mono text-xs">{a.endpoint_slug}</td>
                <td className="p-3 font-mono text-xs">{a.method}</td>
                <td className="p-3">₹{Number(a.price_per_pack)}</td>
                <td className="p-3 font-mono">{a.calls_per_pack}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() =>
                      setEditing({
                        id: a.id,
                        form: {
                          name: a.name,
                          description: a.description,
                          endpoint_slug: a.endpoint_slug,
                          method: a.method,
                          price_per_pack: Number(a.price_per_pack),
                          calls_per_pack: a.calls_per_pack,
                          dummy_response: JSON.stringify(a.dummy_response, null, 2),
                        },
                      })
                    }
                    className="mr-2 rounded-md border border-border p-2 hover:bg-secondary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${a.name}?`)) del.mutate(a.id);
                    }}
                    className="rounded-md border border-border p-2 hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">{editing.id ? "Edit API" : "New API"}</h3>
            <div className="mt-4 grid gap-3">
              {(
                [
                  ["name", "Name", "text"],
                  ["description", "Description", "text"],
                  ["endpoint_slug", "Endpoint slug", "text"],
                ] as const
              ).map(([k, label, type]) => (
                <div key={k}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <input
                    type={type}
                    value={(editing.form as any)[k]}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, [k]: e.target.value } })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Method</label>
                  <select
                    value={editing.form.method}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, method: e.target.value as "GET" | "POST" },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option>GET</option>
                    <option>POST</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Price / pack</label>
                  <input
                    type="number"
                    value={editing.form.price_per_pack}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, price_per_pack: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Calls / pack</label>
                  <input
                    type="number"
                    value={editing.form.calls_per_pack}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, calls_per_pack: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dummy response (JSON)</label>
                <textarea
                  rows={5}
                  value={editing.form.dummy_response}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, dummy_response: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
