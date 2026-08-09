import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { rewardProviderEvents, rewards } from "@/db/schema";
import { TremendousRewardProvider } from "@/services/rewards/TremendousRewardProvider";

export async function POST(request: Request) {
  try {
    if (!process.env.TREMENDOUS_WEBHOOK_SECRET) return Response.json({ error: "Tremendous webhook is not configured." }, { status: 503 });
    const signature = request.headers.get("x-tremendous-webhook-signature");
    if (!signature || signature !== process.env.TREMENDOUS_WEBHOOK_SECRET) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
    const payload = await request.json();
    const event = await new TremendousRewardProvider().handleWebhook(payload);
    await ensureDb();
    const db = getDb();
    const existing = await db.select().from(rewardProviderEvents).where(eq(rewardProviderEvents.providerEventId, event.eventId)).limit(1);
    if (existing.length) return Response.json({ received: true, duplicate: true });
    await db.insert(rewardProviderEvents).values({ id: crypto.randomUUID(), provider: "tremendous", providerEventId: event.eventId, payload: JSON.stringify(payload), processedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
    if (event.rewardId && event.status) await db.update(rewards).set({ status: event.status }).where(eq(rewards.id, event.rewardId));
    return Response.json({ received: true });
  } catch (error) {
    console.error("tremendous_webhook_failed", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
