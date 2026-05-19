import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function handle(request: Request, params: { slug: string }) {
  const t0 = Date.now();
  const key = request.headers.get("x-api-key") ?? "";
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const keyHash = key ? sha256(key) : "";

  if (!key) {
    return Response.json(
      { error: "Missing x-api-key header" },
      { status: 401, headers: cors() },
    );
  }

  const { data, error } = await supabaseAdmin.rpc("meter_api_call", {
    _key_hash: keyHash,
    _slug: params.slug,
    _ip: ip,
    _response_time_ms: Date.now() - t0,
  });

  if (error) {
    return Response.json({ error: "Internal error" }, { status: 500, headers: cors() });
  }
  const result = data as { status: number; data?: unknown; error?: string; remaining?: number };
  if (result.status === 200) {
    return Response.json(
      { data: result.data, remaining_calls: result.remaining },
      { status: 200, headers: cors() },
    );
  }
  return Response.json({ error: result.error }, { status: result.status, headers: cors() });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}

export const Route = createFileRoute("/api/v1/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handle(request, params),
      POST: async ({ request, params }) => handle(request, params),
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});
