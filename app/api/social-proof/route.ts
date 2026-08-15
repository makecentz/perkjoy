import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

const entrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(50),
  kind: z.enum(["reward", "subscription"]),
  plan: z.string().trim().max(40),
  verified: z.boolean(),
  active: z.boolean(),
});

const settingsSchema = z.object({
  enabled: z.boolean(),
  initialDelaySeconds: z.number().int().min(0).max(120),
  displayDurationSeconds: z.number().int().min(3).max(30),
  intervalSeconds: z.number().int().min(8).max(300),
  entries: z.array(entrySchema).min(1).max(50),
});

async function requireSuperAdmin(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  return profile.data?.is_super_admin ? auth : null;
}

export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    const result = await admin.from("social_proof_settings").select("enabled,initial_delay_seconds,display_duration_seconds,interval_seconds,entries,updated_at").eq("id", true).single();
    if (result.error) return Response.json({ error: "Social proof is unavailable." }, { status: 503 });
    return Response.json({
      enabled: result.data.enabled,
      initialDelaySeconds: result.data.initial_delay_seconds,
      displayDurationSeconds: result.data.display_duration_seconds,
      intervalSeconds: result.data.interval_seconds,
      entries: result.data.entries,
      updatedAt: result.data.updated_at,
    }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ error: "Social proof is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (!auth) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the names and timing values, then try again." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const updatedAt = new Date().toISOString();
  const updated = await admin.from("social_proof_settings").update({
    enabled: parsed.data.enabled,
    initial_delay_seconds: parsed.data.initialDelaySeconds,
    display_duration_seconds: parsed.data.displayDurationSeconds,
    interval_seconds: parsed.data.intervalSeconds,
    entries: parsed.data.entries,
    updated_by: auth.user.id,
    updated_at: updatedAt,
  }).eq("id", true).select("updated_at").single();
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });

  const audit = await admin.from("audit_logs").insert({
    user_id: auth.user.id,
    action: "social_proof_settings.updated",
    entity_type: "social_proof_settings",
    metadata: { enabled: parsed.data.enabled, entryCount: parsed.data.entries.length, verifiedCount: parsed.data.entries.filter((entry) => entry.verified).length },
  });
  if (audit.error) return Response.json({ error: "Settings were saved, but the audit record failed." }, { status: 500 });
  return Response.json({ updatedAt: updated.data.updated_at });
}
