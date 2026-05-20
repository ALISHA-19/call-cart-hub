import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function genKey() {
  return "mk_" + crypto.randomBytes(24).toString("hex");
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,email,api_key_hash").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      id: userId,
      email: profile?.email ?? "",
      hasApiKey: !!profile?.api_key_hash,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("apis")
      .select("id,name,description,endpoint_slug,method,price_per_pack,calls_per_pack")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const mySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id,remaining_calls,total_purchased,created_at,apis(id,name,endpoint_slug,method)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const myRecentLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("call_logs")
      .select("id,response_status,response_time_ms,api_slug,created_at,apis(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const myStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ count: total }, { count: todayCount }, { count: subs }] = await Promise.all([
      supabaseAdmin
        .from("call_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
      supabaseAdmin
        .from("call_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .gte("created_at", today.toISOString()),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
    ]);
    return { total: total ?? 0, today: todayCount ?? 0, subs: subs ?? 0 };
  });

export const myLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        apiId: z.string().uuid().optional().nullable(),
        status: z.number().int().optional().nullable(),
        from: z.string().optional().nullable(),
        to: z.string().optional().nullable(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    let q = supabaseAdmin
      .from("call_logs")
      .select("id,response_status,response_time_ms,api_slug,created_at,ip_address,apis(name)", {
        count: "exact",
      })
      .eq("user_id", context.userId);
    if (data.apiId) q = q.eq("api_id", data.apiId);
    if (data.status) q = q.eq("response_status", data.status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const start = (data.page - 1) * data.pageSize;
    q = q.order("created_at", { ascending: false }).range(start, start + data.pageSize - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const buyApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ apiId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: api, error: apiErr } = await supabaseAdmin
      .from("apis")
      .select("id,calls_per_pack")
      .eq("id", data.apiId)
      .single();
    if (apiErr || !api) throw new Error("API not found");

    // Ensure user has an API key
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("api_key_hash")
      .eq("id", context.userId)
      .single();

    let plainKey: string | null = null;
    if (!profile?.api_key_hash) {
      plainKey = genKey();
      await supabaseAdmin
        .from("profiles")
        .update({ api_key_hash: sha256(plainKey) })
        .eq("id", context.userId);
    }

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id,remaining_calls,total_purchased")
      .eq("user_id", context.userId)
      .eq("api_id", api.id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          remaining_calls: existing.remaining_calls + api.calls_per_pack,
          total_purchased: existing.total_purchased + api.calls_per_pack,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert({
        user_id: context.userId,
        api_id: api.id,
        remaining_calls: api.calls_per_pack,
        total_purchased: api.calls_per_pack,
      });
    }
    return { ok: true, newApiKey: plainKey };
  });

export const regenerateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = genKey();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ api_key_hash: sha256(key) })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { apiKey: key };
  });
