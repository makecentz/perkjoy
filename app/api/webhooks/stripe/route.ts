import Stripe from "stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return Response.json({ error: "Stripe billing is not configured." }, { status: 503 });
  try {
    const stripe = new Stripe(secret);
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    // Subscription state is written from verified webhook data in the Supabase deployment.
    console.info("stripe_webhook_verified", { id: event.id, type: event.type });
    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe_webhook_failed", error);
    return Response.json({ error: "Invalid Stripe webhook." }, { status: 400 });
  }
}
