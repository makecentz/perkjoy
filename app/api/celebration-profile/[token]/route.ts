import { allowedStrings, PROFILE_DIETARY, PROFILE_INTERESTS, PROFILE_REWARD_TYPES, PROFILE_SHIRT_SIZES, profileCompleteness } from "@/lib/celebration-profile";
import type { Json } from "@/lib/supabase/database.types";
import { isServerSupabaseConfigured } from "@/lib/supabase/request";
import { GET as getD1Profile, POST as updateD1Profile } from "./d1-route";

type RouteContext = { params: Promise<{ token: string }> };

async function profileFunction(body: Record<string, unknown>) {
  return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/perkjoy-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function GET(request: Request, context: RouteContext) {
  if (!isServerSupabaseConfigured()) return getD1Profile(request, context);
  const { token } = await context.params;
  const response = await profileFunction({ action: "read", token });
  if (!response.ok) {
    const details = await response.text();
    console.error("supabase_profile_invite_read_failed", response.status, details);
    if (response.status === 404) return Response.json({ error: "This invitation has expired. Ask your company for a new link." }, { status: 404 });
    return Response.json({ error: "We couldn't open this invitation. Please ask for a fresh link." }, { status: 500 });
  }
  const data = await response.json();
  return Response.json(data, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request, context: RouteContext) {
  if (!isServerSupabaseConfigured()) return updateD1Profile(request, context);
  const { token } = await context.params;
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "We couldn't read that profile. Please try again." }, { status: 400 });
  }

  const food = {
    cake: String(payload.favoriteCake ?? "").slice(0, 80),
    dessert: String(payload.favoriteDessert ?? "").slice(0, 80),
    restaurant: String(payload.favoriteRestaurant ?? "").slice(0, 120),
    lunch: String(payload.favoriteLunch ?? "").slice(0, 100),
    snack: String(payload.favoriteSnack ?? "").slice(0, 80),
    drink: String(payload.favoriteDrink ?? "").slice(0, 80),
  };
  const stores = Array.isArray(payload.favoriteStores)
    ? [...new Set(payload.favoriteStores.map((item) => String(item).trim().slice(0, 80)).filter(Boolean))].slice(0, 8)
    : [];
  const rewards = { stores, types: allowedStrings(payload.rewardTypes, PROFILE_REWARD_TYPES, 6) };
  const interests = allowedStrings(payload.interests, PROFILE_INTERESTS, 12);
  const dietary = allowedStrings(payload.dietary, PROFILE_DIETARY, 6);
  const shirtSize = PROFILE_SHIRT_SIZES.includes(String(payload.shirtSize) as typeof PROFILE_SHIRT_SIZES[number]) ? String(payload.shirtSize) : "";
  const preferredDelivery = ["workplace", "home", "digital_only"].includes(String(payload.preferredDelivery)) ? String(payload.preferredDelivery) : "workplace";
  const completeness = profileCompleteness({ food, stores, rewardTypes: rewards.types, interests, dietary, shirtSize, preferredDelivery });
  const safePayload: Json = {
    food,
    rewards,
    interests,
    dietary,
    shirtSize,
    preferredDelivery,
    privacyMode: payload.privacyMode === "share_with_hr" ? "share_with_hr" : "recommendations_only",
    completeness,
  };

  const response = await profileFunction({ action: "complete", token, payload: safePayload });
  if (!response.ok) {
    const details = await response.text();
    console.error("supabase_profile_invite_update_failed", response.status, details);
    const expired = response.status === 404;
    return Response.json({ error: expired ? "This invitation has expired. Ask your company for a new link." : "We couldn't save your profile. Please try again." }, { status: expired ? 404 : 500 });
  }
  const data = await response.json() as { completeness: number };
  return Response.json({ ok: true, completeness: data.completeness }, { headers: { "Cache-Control": "no-store, private" } });
}
