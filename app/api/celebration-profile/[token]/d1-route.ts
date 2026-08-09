// Cloudflare D1 fallback for local previews without Supabase configuration.
import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { auditLogs, celebrationPreferences, celebrationProfiles, employees, organizations } from "@/db/schema";
import { allowedStrings, hashProfileToken, PROFILE_DIETARY, PROFILE_INTERESTS, PROFILE_REWARD_TYPES, PROFILE_SHIRT_SIZES, profileCompleteness } from "@/lib/celebration-profile";

type RouteContext = { params: Promise<{ token: string }> };

async function invitation(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  await ensureDb();
  const db = getDb();
  const [profile] = await db.select().from(celebrationProfiles).where(eq(celebrationProfiles.inviteTokenHash, await hashProfileToken(token))).limit(1);
  if (!profile || new Date(profile.inviteExpiresAt).getTime() < Date.now()) return null;
  const [employee] = await db.select().from(employees).where(and(eq(employees.id, profile.employeeId), eq(employees.organizationId, profile.organizationId))).limit(1);
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, profile.organizationId)).limit(1);
  if (!employee || !organization) return null;
  return { db, profile, employee, organization };
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invite = await invitation(token);
  if (!invite) return Response.json({ error: "This invitation has expired. Ask your company for a new link." }, { status: 404 });
  const [preferences] = await invite.db.select().from(celebrationPreferences).where(and(eq(celebrationPreferences.employeeId, invite.employee.id), eq(celebrationPreferences.organizationId, invite.organization.id))).limit(1);
  return Response.json({
    firstName: invite.employee.firstName,
    organizationName: invite.organization.name,
    completeness: invite.profile.completeness,
    privacyMode: invite.profile.privacyMode,
    preferredDelivery: invite.profile.preferredDelivery,
    preferences: preferences ? {
      food: JSON.parse(preferences.food), rewards: JSON.parse(preferences.rewards), interests: JSON.parse(preferences.interests),
      shirtSize: preferences.shirtSize ?? "", dietary: JSON.parse(preferences.dietary),
    } : null,
  }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invite = await invitation(token);
  if (!invite) return Response.json({ error: "This invitation has expired. Ask your company for a new link." }, { status: 404 });
  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "We couldn't read that profile. Please try again." }, { status: 400 }); }
  const updatedAt = new Date().toISOString();
  const food = {
    cake: String(payload.favoriteCake ?? "").slice(0, 80), dessert: String(payload.favoriteDessert ?? "").slice(0, 80),
    restaurant: String(payload.favoriteRestaurant ?? "").slice(0, 120), lunch: String(payload.favoriteLunch ?? "").slice(0, 100),
    snack: String(payload.favoriteSnack ?? "").slice(0, 80), drink: String(payload.favoriteDrink ?? "").slice(0, 80),
  };
  const stores = Array.isArray(payload.favoriteStores) ? [...new Set(payload.favoriteStores.map((item) => String(item).trim().slice(0, 80)).filter(Boolean))].slice(0, 8) : [];
  const rewards = { stores, types: allowedStrings(payload.rewardTypes, PROFILE_REWARD_TYPES, 6) };
  const interests = allowedStrings(payload.interests, PROFILE_INTERESTS, 12);
  const dietary = allowedStrings(payload.dietary, PROFILE_DIETARY, 6);
  const shirtSize = PROFILE_SHIRT_SIZES.includes(String(payload.shirtSize) as typeof PROFILE_SHIRT_SIZES[number]) ? String(payload.shirtSize) : "";
  const preferredDelivery = ["workplace", "home", "digital_only"].includes(String(payload.preferredDelivery)) ? String(payload.preferredDelivery) as "workplace" | "home" | "digital_only" : "workplace";
  const completeness = profileCompleteness({ food, stores, rewardTypes: rewards.types, interests, dietary, shirtSize, preferredDelivery });
  const [existing] = await invite.db.select().from(celebrationPreferences).where(and(eq(celebrationPreferences.employeeId, invite.employee.id), eq(celebrationPreferences.organizationId, invite.organization.id))).limit(1);
  const values = {
    organizationId: invite.organization.id, employeeId: invite.employee.id, food: JSON.stringify(food), rewards: JSON.stringify(rewards),
    interests: JSON.stringify(interests), shirtSize: shirtSize || null, dietary: JSON.stringify(dietary),
    shareWithHr: payload.privacyMode === "share_with_hr", updatedAt,
  };
  if (existing) await invite.db.update(celebrationPreferences).set(values).where(eq(celebrationPreferences.id, existing.id));
  else await invite.db.insert(celebrationPreferences).values({ id: crypto.randomUUID(), ...values, createdAt: updatedAt });
  await invite.db.update(celebrationProfiles).set({ completeness, privacyMode: payload.privacyMode === "share_with_hr" ? "share_with_hr" : "recommendations_only", preferredDelivery, updatedAt }).where(eq(celebrationProfiles.id, invite.profile.id));
  await invite.db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: invite.organization.id, actorId: "employee-invite-token", action: "celebration_profile.updated", entityType: "celebration_profile", entityId: invite.profile.id, metadata: JSON.stringify({ completeness, privacyMode: payload.privacyMode }), createdAt: updatedAt });
  return Response.json({ ok: true, completeness }, { headers: { "Cache-Control": "no-store, private" } });
}
