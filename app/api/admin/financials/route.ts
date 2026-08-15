import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

const updateSchema = z.object({ rateBps: z.number().int().min(0).max(5000) });

async function requireSuperAdmin(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  return profile.data?.is_super_admin ? auth : null;
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (!auth) return Response.json({ error: "Super Admin access is required." }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a rate from 0% through 50%." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const current = await admin.from("platform_financial_settings").select("local_transaction_fee_bps").eq("id", true).single();
  if (current.error) return Response.json({ error: current.error.message }, { status: 500 });

  const updatedAt = new Date().toISOString();
  const updated = await admin.from("platform_financial_settings").update({
    local_transaction_fee_bps: parsed.data.rateBps,
    updated_by: auth.user.id,
    updated_at: updatedAt,
  }).eq("id", true).select("local_transaction_fee_bps,updated_at").single();
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });

  const audit = await admin.from("audit_logs").insert({
    user_id: auth.user.id,
    action: "platform_financial_settings.updated",
    entity_type: "platform_financial_settings",
    metadata: { previousRateBps: current.data.local_transaction_fee_bps, newRateBps: updated.data.local_transaction_fee_bps },
  });
  if (audit.error) return Response.json({ error: "The rate changed, but its audit record could not be saved." }, { status: 500 });

  return Response.json({ rateBps: updated.data.local_transaction_fee_bps, updatedAt: updated.data.updated_at });
}
