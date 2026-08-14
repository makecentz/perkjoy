import { createGoodyGift, retrieveGoodyProduct } from "@/lib/goody/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to send a Goody reward." }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const employeeId = String(payload.employeeId || "");
    const productId = String(payload.productId || "");
    const requestId = String(payload.requestId || "");
    const message = String(payload.message || "Thank you for everything you do!").trim().slice(0, 500);
    if (!UUID.test(employeeId) || !UUID.test(productId) || !UUID.test(requestId)) {
      return Response.json({ error: "Choose a valid employee and Goody reward." }, { status: 400 });
    }

    const membership = await auth.client.from("organization_members").select("organization_id,role").eq("user_id", auth.user.id).limit(1).single();
    const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
    if (membership.error || profile.error) throw membership.error || profile.error;
    if (!profile.data.is_super_admin && !["OWNER", "ADMIN"].includes(membership.data.role)) {
      return Response.json({ error: "Only company admins can purchase rewards." }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const idempotencyKey = `goody:${requestId}`;
    const existing = await admin.from("rewards").select("id,provider_order_id,provider_reward_id,status").eq("organization_id", membership.data.organization_id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return Response.json({ reward: existing.data, duplicate: true });

    const employee = await admin.from("employees").select("id,first_name,last_name,email").eq("id", employeeId).eq("organization_id", membership.data.organization_id).eq("status", "active").single();
    if (employee.error) return Response.json({ error: "That employee is not available for gifting." }, { status: 404 });
    const product = await retrieveGoodyProduct(productId);
    if (product.status && product.status !== "active") return Response.json({ error: "That Goody reward is no longer available." }, { status: 409 });

    const batch = await createGoodyGift({
      requestId: idempotencyKey,
      fromName: process.env.GOODY_FROM_NAME || "PerkJoy",
      message,
      recipient: { firstName: employee.data.first_name, lastName: employee.data.last_name, email: employee.data.email },
      productId,
    });
    const order = batch.orders_preview[0];
    const amountCents = order?.amounts?.amount_total ?? order?.amounts?.amount_pre_tax_total ?? product.price;
    const event = await admin.from("recognition_events").insert({
      organization_id: membership.data.organization_id,
      employee_id: employeeId,
      event_type: "Goody Gift",
      event_year: new Date().getUTCFullYear(),
      event_key: idempotencyKey,
      event_date: new Date().toISOString().slice(0, 10),
      status: "handled",
      metadata: { message, productId, productName: product.name, brandName: product.brand.name },
    }).select("id").single();
    if (event.error) throw event.error;

    const reward = await admin.from("rewards").insert({
      organization_id: membership.data.organization_id,
      employee_id: employeeId,
      recognition_event_id: event.data.id,
      provider: "goody",
      provider_order_id: batch.id,
      provider_reward_id: order?.id ?? null,
      amount: amountCents / 100,
      currency: "USD",
      recipient_name: `${employee.data.first_name} ${employee.data.last_name}`,
      recipient_email: employee.data.email,
      delivery_method: "email_and_link",
      status: order ? "sent" : "processing",
      sent_at: order ? new Date().toISOString() : null,
      idempotency_key: idempotencyKey,
      test_mode: false,
    }).select("id,provider_order_id,provider_reward_id,status").single();
    if (reward.error) throw reward.error;

    return Response.json({ reward: reward.data, giftLink: order?.individual_gift_link ?? null, sendStatus: batch.send_status }, { status: 201 });
  } catch (error) {
    console.error("goody_order_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unable to send the Goody reward." }, { status: 502 });
  }
}
