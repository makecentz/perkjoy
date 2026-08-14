import { appUrl, getStripe } from "@/lib/stripe/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to connect a vendor." }, { status: 401 });
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  if (profile.error || !profile.data.is_super_admin) return Response.json({ error: "Super Admin access is required." }, { status: 403 });

  try {
    const { vendorId } = await request.json() as { vendorId?: string };
    if (!vendorId) return Response.json({ error: "Choose a vendor." }, { status: 400 });
    const admin = createAdminSupabaseClient();
    const vendor = await admin.from("vendors").select("id,business_name,email,stripe_account_id").eq("id", vendorId).single();
    if (vendor.error) return Response.json({ error: "Vendor not found." }, { status: 404 });

    const stripe = getStripe();
    let accountId = vendor.data.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: vendor.data.email || undefined,
        business_profile: { name: vendor.data.business_name, product_description: "Local gifts and celebration fulfillment through PerkJoy" },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { perkjoy_vendor_id: vendor.data.id },
      }, { idempotencyKey: `perkjoy-vendor-${vendor.data.id}` });
      accountId = account.id;
      const saved = await admin.from("vendors").update({ stripe_account_id: account.id, stripe_connected_at: new Date().toISOString() }).eq("id", vendor.data.id);
      if (saved.error) throw saved.error;
    }

    const baseUrl = appUrl();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/perkjoy-local?stripe_connect=refresh`,
      return_url: `${baseUrl}/perkjoy-local?stripe_connect=return`,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    });
    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error("stripe_connect_onboarding_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unable to start Stripe onboarding." }, { status: 502 });
  }
}
