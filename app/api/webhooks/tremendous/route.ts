import type { Database, Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { TremendousRewardProvider } from "@/services/rewards/TremendousRewardProvider";

type RewardStatus = Database["public"]["Enums"]["reward_status"];
const rewardStatuses = new Set<RewardStatus>(["draft", "pending_approval", "scheduled", "processing", "sent", "delivered", "redeemed", "failed", "cancelled", "refunded"]);

export async function POST(request: Request) {
  try {
    if (!process.env.TREMENDOUS_WEBHOOK_SECRET) return Response.json({ error: "Tremendous webhook is not configured." }, { status: 503 });
    const signature = request.headers.get("x-tremendous-webhook-signature");
    if (!signature || signature !== process.env.TREMENDOUS_WEBHOOK_SECRET) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
    const payload = await request.json();
    const event = await new TremendousRewardProvider().handleWebhook(payload);
    const client = createAdminSupabaseClient();
    const existing = await client.from("reward_provider_events").select("id").eq("provider_event_id", event.eventId).limit(1);
    if (existing.error) throw existing.error;
    if (existing.data.length) return Response.json({ received: true, duplicate: true });
    const reward = event.rewardId ? await client.from("rewards").select("id").eq("provider_reward_id", event.rewardId).maybeSingle() : { data: null, error: null };
    if (reward.error) throw reward.error;
    const inserted = await client.from("reward_provider_events").insert({ provider: "tremendous", provider_event_id: event.eventId, payload: payload as Json, processed_at: new Date().toISOString(), reward_id: reward.data?.id ?? null });
    if (inserted.error) throw inserted.error;
    if (reward.data && event.status && rewardStatuses.has(event.status as RewardStatus)) {
      const updated = await client.from("rewards").update({ status: event.status as RewardStatus }).eq("id", reward.data.id);
      if (updated.error) throw updated.error;
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("tremendous_webhook_failed", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
