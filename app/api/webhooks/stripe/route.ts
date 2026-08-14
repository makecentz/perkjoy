import type Stripe from "stripe";
import type { Json } from "@/lib/supabase/database.types";
import { getStripe } from "@/lib/stripe/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) return Response.json({ error: "Stripe is not configured." }, { status: 503 });
  try {
    const stripe = getStripe();
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const admin = createAdminSupabaseClient();
    const existing = await admin.from("payment_provider_events").select("id").eq("provider", "stripe").eq("provider_event_id", event.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return Response.json({ received: true, duplicate: true });

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const vendorId = account.metadata?.perkjoy_vendor_id;
      const query = admin.from("vendors").update({
        stripe_details_submitted: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
      });
      const updated = vendorId ? await query.eq("id", vendorId) : await query.eq("stripe_account_id", account.id);
      if (updated.error) throw updated.error;
    } else if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.perkjoy_order_id || session.client_reference_id;
      if (orderId) {
        const updated = await admin.from("local_gift_orders").update({ status: "paid", stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id, paid_at: new Date().toISOString() }).eq("id", orderId);
        if (updated.error) throw updated.error;
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.perkjoy_order_id || session.client_reference_id;
      if (orderId) {
        const updated = await admin.from("local_gift_orders").update({ status: event.type === "checkout.session.expired" ? "cancelled" : "issue" }).eq("id", orderId);
        if (updated.error) throw updated.error;
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntentId) {
        const updated = await admin.from("local_gift_orders").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId);
        if (updated.error) throw updated.error;
      }
    }

    const recorded = await admin.from("payment_provider_events").insert({ provider: "stripe", provider_event_id: event.id, event_type: event.type, payload: event as unknown as Json, processed_at: new Date().toISOString() });
    if (recorded.error) throw recorded.error;
    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe_webhook_failed", error);
    return Response.json({ error: "Invalid Stripe webhook or processing failure." }, { status: 400 });
  }
}
