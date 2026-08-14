import { authenticateSupabaseRequest } from "@/lib/supabase/request";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

type Health = "ok" | "down" | "configured" | "missing";
type IntegrationStatus = { id: string; name: string; description: string; health: Health; detail: string; identifier?: string };

function mask(value?: string) {
  if (!value) return undefined;
  const tail = value.slice(-8);
  return `••••••••${tail}`;
}

async function requireSuperAdmin(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  return profile.data?.is_super_admin ? auth : null;
}

export async function GET(request: Request) {
  if (!await requireSuperAdmin(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });

  const statuses: IntegrationStatus[] = [];
  try {
    await getStripe().balance.retrieve();
    let connectReady = true;
    try { await getStripe().accounts.list({ limit: 1 }); } catch { connectReady = false; }
    statuses.push({ id: "stripe", name: "Stripe Connect", description: "Local checkout and vendor payouts", health: connectReady ? "ok" : "down", detail: connectReady ? "API and Connect access verified" : "Stripe works, but Connect platform access is not active", identifier: mask(process.env.STRIPE_SECRET_KEY) });
  } catch (error) {
    statuses.push({ id: "stripe", name: "Stripe Connect", description: "Local checkout and vendor payouts", health: process.env.STRIPE_SECRET_KEY ? "down" : "missing", detail: error instanceof Error ? error.message : "Unable to verify Stripe", identifier: mask(process.env.STRIPE_SECRET_KEY) });
  }

  try {
    const response = await fetch(`${(process.env.GOODY_API_BASE_URL || "https://api.ongoody.com").replace(/\/$/, "")}/v1/products?per_page=1&country_code=US`, { headers: { Authorization: `Bearer ${process.env.GOODY_API_KEY}`, Accept: "application/json" }, cache: "no-store" });
    statuses.push({ id: "goody", name: "Goody", description: "Digital and shipped reward catalog", health: response.ok ? "ok" : "down", detail: response.ok ? "Catalog API verified" : `API returned ${response.status}`, identifier: mask(process.env.GOODY_API_KEY) });
  } catch {
    statuses.push({ id: "goody", name: "Goody", description: "Digital and shipped reward catalog", health: process.env.GOODY_API_KEY ? "down" : "missing", detail: "Unable to reach Goody", identifier: mask(process.env.GOODY_API_KEY) });
  }

  try {
    const result = await createAdminSupabaseClient().from("profiles").select("id", { count: "exact", head: true });
    statuses.push({ id: "supabase", name: "Supabase", description: "Database, authentication, and authorization", health: result.error ? "down" : "ok", detail: result.error ? result.error.message : "Database and service credentials verified", identifier: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] });
  } catch {
    statuses.push({ id: "supabase", name: "Supabase", description: "Database, authentication, and authorization", health: "down", detail: "Unable to verify Supabase" });
  }

  statuses.push(
    { id: "google", name: "Google OAuth", description: "Google account sign-in", health: process.env.GOOGLE_OAUTH_CLIENT_ID ? "configured" : "missing", detail: process.env.GOOGLE_OAUTH_CLIENT_ID ? "Client ID recorded; Google sign-in verifies it end to end" : "Client ID is not recorded in PerkJoy", identifier: mask(process.env.GOOGLE_OAUTH_CLIENT_ID) },
    { id: "stripe-webhook", name: "Stripe webhook", description: "Payment and connected-account events", health: process.env.STRIPE_WEBHOOK_SECRET ? "configured" : "missing", detail: process.env.STRIPE_WEBHOOK_SECRET ? "Signing secret configured; delivery status is verified by Stripe events" : "Signing secret is missing", identifier: mask(process.env.STRIPE_WEBHOOK_SECRET) },
    { id: "goody-webhook", name: "Goody webhook", description: "Reward fulfillment updates", health: process.env.GOODY_WEBHOOK_SECRET ? "configured" : "missing", detail: process.env.GOODY_WEBHOOK_SECRET ? "Signing secret configured" : "Signing secret is missing", identifier: mask(process.env.GOODY_WEBHOOK_SECRET) },
    { id: "tremendous-webhook", name: "Tremendous webhook", description: "Digital reward status updates", health: process.env.TREMENDOUS_WEBHOOK_SECRET ? "configured" : "missing", detail: process.env.TREMENDOUS_WEBHOOK_SECRET ? "Signing secret configured" : "Signing secret is missing", identifier: mask(process.env.TREMENDOUS_WEBHOOK_SECRET) },
  );

  return Response.json({ statuses, manageUrl: "https://vercel.com/ecomexperts/perkjoy/settings/environment-variables", checkedAt: new Date().toISOString() });
}
