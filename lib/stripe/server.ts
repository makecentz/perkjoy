import Stripe from "stripe";

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe is not configured for this deployment.");
  return new Stripe(secret, { typescript: true });
}

export function appUrl() {
  return (process.env.APP_URL || "https://www.perkjoy.work").replace(/\/$/, "");
}
