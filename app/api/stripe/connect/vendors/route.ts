import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to manage vendor payouts." }, { status: 401 });
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  if (profile.error || !profile.data.is_super_admin) return Response.json({ error: "Super Admin access is required." }, { status: 403 });

  const result = await createAdminSupabaseClient().from("vendors").select("id,business_name,email,active,demo,stripe_account_id,stripe_details_submitted,stripe_charges_enabled,stripe_payouts_enabled").order("business_name");
  if (result.error) throw result.error;
  return Response.json({ vendors: result.data.map((vendor) => ({
    id: vendor.id,
    name: vendor.business_name,
    email: vendor.email,
    active: vendor.active,
    demo: vendor.demo,
    connected: Boolean(vendor.stripe_account_id),
    detailsSubmitted: vendor.stripe_details_submitted,
    chargesEnabled: vendor.stripe_charges_enabled,
    payoutsEnabled: vendor.stripe_payouts_enabled,
  })) });
}
