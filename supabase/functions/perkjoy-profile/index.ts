import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, private",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function validToken(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 40
    && value.length <= 128
    && /^[A-Za-z0-9_-]+$/.test(value);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32_768) return json({ error: "Request too large" }, 413);

  let body: { action?: unknown; token?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!validToken(body.token)) return json({ error: "Invalid or expired invitation" }, 404);
  if (body.action !== "read" && body.action !== "complete") return json({ error: "Invalid action" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("perkjoy_profile_missing_managed_secrets");
    return json({ error: "Service unavailable" }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "read") {
    const { data, error } = await supabase.rpc("read_celebration_profile_invite_internal", {
      p_token: body.token,
    });
    if (error) {
      console.error("perkjoy_profile_read_failed", error.code, error.message);
      return json({ error: "Unable to open invitation" }, 500);
    }
    if (!data) return json({ error: "Invalid or expired invitation" }, 404);
    return json(data);
  }

  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return json({ error: "Invalid profile" }, 400);
  }

  const { data, error } = await supabase.rpc("complete_celebration_profile_invite_internal", {
    p_token: body.token,
    p_payload: body.payload,
  });
  if (error) {
    console.error("perkjoy_profile_complete_failed", error.code, error.message);
    const expired = /invalid or expired/i.test(error.message);
    return json({ error: expired ? "Invalid or expired invitation" : "Unable to save profile" }, expired ? 404 : 500);
  }
  return json({ ok: true, completeness: data });
});
