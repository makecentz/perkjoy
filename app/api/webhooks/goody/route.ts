import { Webhook } from "svix";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RewardStatus = Database["public"]["Enums"]["reward_status"];
type GoodyEvent = { event_type: string; event_id?: string; id?: string; data?: { id?: string; status?: string } };

const statusByEvent: Record<string, RewardStatus> = {
  "order.created": "sent",
  "order.gift_opened": "sent",
  "order.gift_accepted": "redeemed",
  "order.shipped": "sent",
  "order.delivered": "delivered",
  "order.canceled": "cancelled",
  "order.refunded": "refunded",
};

export async function POST(request: Request) {
  try {
    const secret = process.env.GOODY_WEBHOOK_SECRET;
    if (!secret) return Response.json({ error: "Goody webhook is not configured." }, { status: 503 });
    const rawBody = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };
    const event = new Webhook(secret).verify(rawBody, headers) as GoodyEvent;
    const eventId = event.event_id || event.id;
    if (!eventId || !event.event_type) return Response.json({ error: "Invalid Goody event." }, { status: 400 });

    const client = createAdminSupabaseClient();
    const existing = await client.from("reward_provider_events").select("id").eq("provider", "goody").eq("provider_event_id", eventId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return Response.json({ received: true, duplicate: true });

    const reward = event.data?.id
      ? await client.from("rewards").select("id").eq("provider", "goody").eq("provider_reward_id", event.data.id).maybeSingle()
      : { data: null, error: null };
    if (reward.error) throw reward.error;

    const inserted = await client.from("reward_provider_events").insert({
      provider: "goody",
      provider_event_id: eventId,
      payload: event as unknown as Json,
      processed_at: new Date().toISOString(),
      reward_id: reward.data?.id ?? null,
    });
    if (inserted.error) throw inserted.error;

    const status = statusByEvent[event.event_type];
    if (reward.data && status) {
      const timestamps = status === "delivered" ? { delivered_at: new Date().toISOString() } : {};
      const updated = await client.from("rewards").update({ status, ...timestamps }).eq("id", reward.data.id);
      if (updated.error) throw updated.error;
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("goody_webhook_failed", error);
    return Response.json({ error: "Webhook verification or processing failed." }, { status: 400 });
  }
}
