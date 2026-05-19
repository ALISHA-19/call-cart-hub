import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./admin-check.server";

const apiSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  endpoint_slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, dashes only"),
  method: z.enum(["GET", "POST"]),
  price_per_pack: z.number().min(0),
  calls_per_pack: z.number().int().min(1),
  dummy_response: z.any(),
});

export const adminListApis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("apis")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => apiSchema.parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("apis").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), patch: apiSchema.partial() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("apis").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("apis").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,created_at")
      .order("created_at", { ascending: false });
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id,remaining_calls,total_purchased,apis(name,endpoint_slug)");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      subs: (subs ?? []).filter((s) => s.user_id === p.id),
    }));
  });

export const adminListLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        apiId: z.string().uuid().optional().nullable(),
        userId: z.string().uuid().optional().nullable(),
        status: z.number().int().optional().nullable(),
        from: z.string().optional().nullable(),
        to: z.string().optional().nullable(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("call_logs")
      .select(
        "id,response_status,response_time_ms,api_slug,created_at,ip_address,user_id,apis(name),profiles!call_logs_user_id_fkey(email)",
        { count: "exact" },
      );
    if (data.apiId) q = q.eq("api_id", data.apiId);
    if (data.userId) q = q.eq("user_id", data.userId);
    if (data.status) q = q.eq("response_status", data.status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const start = (data.page - 1) * data.pageSize;
    q = q.order("created_at", { ascending: false }).range(start, start + data.pageSize - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: callsToday } = await supabaseAdmin
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());

    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("total_purchased,apis(price_per_pack,calls_per_pack)");
    const revenue = (subs ?? []).reduce((acc, s: any) => {
      const a = s.apis;
      if (!a) return acc;
      return acc + (s.total_purchased / a.calls_per_pack) * Number(a.price_per_pack);
    }, 0);

    const { data: allLogs } = await supabaseAdmin
      .from("call_logs")
      .select("api_id,user_id,apis(name),profiles!call_logs_user_id_fkey(email)")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .limit(10000);

    const apiCounts = new Map<string, { name: string; count: number }>();
    const userCounts = new Map<string, { email: string; count: number }>();
    for (const l of allLogs ?? []) {
      const a: any = (l as any).apis;
      const p: any = (l as any).profiles;
      if (a?.name) {
        const k = a.name;
        apiCounts.set(k, { name: k, count: (apiCounts.get(k)?.count ?? 0) + 1 });
      }
      if (p?.email) {
        const k = p.email;
        userCounts.set(k, { email: k, count: (userCounts.get(k)?.count ?? 0) + 1 });
      }
    }
    const topApis = [...apiCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
    const topUsers = [...userCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const { count: totalApis } = await supabaseAdmin
      .from("apis")
      .select("*", { count: "exact", head: true });

    return {
      callsToday: callsToday ?? 0,
      revenue: Math.round(revenue * 100) / 100,
      topApis,
      topUsers,
      totalUsers: totalUsers ?? 0,
      totalApis: totalApis ?? 0,
    };
  });
