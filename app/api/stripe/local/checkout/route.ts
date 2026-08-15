import { appUrl, getStripe } from "@/lib/stripe/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to purchase a local gift." }, { status: 401 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const membership = await auth.client.from("organization_members").select("organization_id,role").eq("user_id", auth.user.id).limit(1).single();
    const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
    if (membership.error || profile.error) throw membership.error || profile.error;
    if (!profile.data.is_super_admin && !["OWNER", "ADMIN"].includes(membership.data.role)) return Response.json({ error: "Only company admins can purchase local gifts." }, { status: 403 });

    const admin = createAdminSupabaseClient();
    const product = await admin.from("vendor_products").select("id,name,vendor_id").eq("id", String(payload.productId || "")).eq("active", true).single();
    if (product.error) return Response.json({ error: "That local gift is no longer available." }, { status: 404 });
    const vendor = await admin.from("vendors").select("id,business_name,stripe_account_id,stripe_charges_enabled,stripe_payouts_enabled").eq("id", product.data.vendor_id).eq("active", true).single();
    if (vendor.error) throw vendor.error;
    if (!vendor.data.stripe_account_id || !vendor.data.stripe_charges_enabled || !vendor.data.stripe_payouts_enabled) {
      return Response.json({ error: `${vendor.data.business_name} is not ready to accept online payments yet.` }, { status: 409 });
    }

    const orderId = await auth.client.rpc("create_perkjoy_local_order", {
      p_employee_id: String(payload.employeeId || ""),
      p_product_id: String(payload.productId || ""),
      p_delivery_date: String(payload.deliveryDate || ""),
      p_gift_message: String(payload.giftMessage || "Hope your day is as wonderful as you are."),
    });
    if (orderId.error) throw orderId.error;

    const order = await admin.from("local_gift_orders").select("id,organization_id,employee_id,product_id,customer_amount,vendor_cost,delivery_fee,platform_fee_amount,platform_fee_rate_bps,status").eq("id", orderId.data).single();
    if (order.error) throw order.error;

    const totalCents = Math.round((order.data.customer_amount + order.data.delivery_fee) * 100);
    const platformFeeCents = Math.max(0, Math.round(order.data.platform_fee_amount * 100));
    const baseUrl = appUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: auth.user.email,
      client_reference_id: order.data.id,
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: totalCents, product_data: { name: product.data.name, description: `PerkJoy Local · ${vendor.data.business_name}` } } }],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: vendor.data.stripe_account_id },
        metadata: { perkjoy_order_id: order.data.id, perkjoy_vendor_id: vendor.data.id, perkjoy_organization_id: order.data.organization_id, perkjoy_fee_rate_bps: String(order.data.platform_fee_rate_bps) },
      },
      metadata: { perkjoy_order_id: order.data.id, perkjoy_vendor_id: vendor.data.id, perkjoy_organization_id: order.data.organization_id },
      success_url: `${baseUrl}/perkjoy-local?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/perkjoy-local?checkout=cancelled`,
    }, { idempotencyKey: `perkjoy-local-${order.data.id}` });

    const updated = await admin.from("local_gift_orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.data.id);
    if (updated.error) throw updated.error;
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("stripe_local_checkout_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unable to open secure checkout." }, { status: 400 });
  }
}
