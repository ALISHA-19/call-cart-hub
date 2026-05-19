import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

const ADMIN_EMAIL = "admin@marketplace.dev";
const ADMIN_PASS = "Admin@123";
const USER_EMAIL = "user@test.dev";
const USER_PASS = "User@123";
const SEED_USER_KEY = "mk_seeduser_demo_key_0000000000000000";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function ensureUser(email: string, password: string) {
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user!;
  }
  return user;
}

async function run() {
  const admin = await ensureUser(ADMIN_EMAIL, ADMIN_PASS);
  const user = await ensureUser(USER_EMAIL, USER_PASS);

  // Ensure admin role on admin user (trigger only gives 'user')
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: admin.id, role: "admin" }, { onConflict: "user_id,role" });

  // Set seed user API key
  await supabaseAdmin
    .from("profiles")
    .update({ api_key_hash: sha256(SEED_USER_KEY) })
    .eq("id", user.id);

  // Subscribe seed user to Weather API with 950 remaining
  const { data: weather } = await supabaseAdmin
    .from("apis")
    .select("id,calls_per_pack")
    .eq("endpoint_slug", "weather")
    .single();
  if (weather) {
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("api_id", weather.id)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("subscriptions").insert({
        user_id: user.id,
        api_id: weather.id,
        remaining_calls: 950,
        total_purchased: 1000,
      });
    }
  }

  return {
    ok: true,
    accounts: {
      admin: { email: ADMIN_EMAIL, password: ADMIN_PASS },
      user: { email: USER_EMAIL, password: USER_PASS, apiKey: SEED_USER_KEY },
    },
  };
}

export const Route = createFileRoute("/api/public/bootstrap")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json(await run());
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
        }
      },
      POST: async () => {
        try {
          return Response.json(await run());
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
        }
      },
    },
  },
});
