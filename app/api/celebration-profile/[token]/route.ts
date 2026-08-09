import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { auditLogs, celebrationPreferences, celebrationProfiles, employees, organizations } from "@/db/schema";

type RouteContext = { params: Promise<{ token: string }> };

async function invitation(token: string) {
  await ensureDb();
  const db = getDb();
  const [profile] = await db.select().from(celebrationProfiles).where(eq(celebrationProfiles.inviteToken, token)).limit(1);
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
  return Response.json({
    firstName: invite.employee.firstName,
    organizationName: invite.organization.name,
    completeness: invite.profile.completeness,
    privacyMode: invite.profile.privacyMode,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invite = await invitation(token);
  if (!invite) return Response.json({ error: "This invitation has expired. Ask your company for a new link." }, { status: 404 });
  const payload = await request.json() as Record<string, unknown>;
  const updatedAt = new Date().toISOString();
  const food = {
    cake: String(payload.favoriteCake ?? "").slice(0, 80), dessert: String(payload.favoriteDessert ?? "").slice(0, 80),
    restaurant: String(payload.favoriteRestaurant ?? "").slice(0, 120), lunch: String(payload.favoriteLunch ?? "").slice(0, 100),
    snack: String(payload.favoriteSnack ?? "").slice(0, 80), drink: String(payload.favoriteDrink ?? "").slice(0, 80),
  };
  const rewards = { stores: Array.isArray(payload.favoriteStores) ? payload.favoriteStores.slice(0, 8) : [], types: Array.isArray(payload.rewardTypes) ? payload.rewardTypes.slice(0, 8) : [] };
  const interests = Array.isArray(payload.interests) ? payload.interests.slice(0, 12) : [];
  const dietary = Array.isArray(payload.dietary) ? payload.dietary.slice(0, 8) : [];
  const answered = [...Object.values(food), ...rewards.stores, ...rewards.types, ...interests, ...dietary, String(payload.shirtSize ?? ""), String(payload.preferredDelivery ?? "")].filter(Boolean).length;
  const completeness = Math.min(100, Math.max(20, Math.round(answered / 18 * 100)));
  const [existing] = await invite.db.select().from(celebrationPreferences).where(eq(celebrationPreferences.employeeId, invite.employee.id)).limit(1);
  const values = {
    organizationId: invite.organization.id, employeeId: invite.employee.id, food: JSON.stringify(food), rewards: JSON.stringify(rewards),
    interests: JSON.stringify(interests), shirtSize: String(payload.shirtSize ?? "") || null, dietary: JSON.stringify(dietary),
    shareWithHr: payload.privacyMode === "share_with_hr", updatedAt,
  };
  if (existing) await invite.db.update(celebrationPreferences).set(values).where(eq(celebrationPreferences.id, existing.id));
  else await invite.db.insert(celebrationPreferences).values({ id: crypto.randomUUID(), ...values, createdAt: updatedAt });
  await invite.db.update(celebrationProfiles).set({ completeness, privacyMode: payload.privacyMode === "share_with_hr" ? "share_with_hr" : "recommendations_only", preferredDelivery: ["workplace", "home", "digital_only"].includes(String(payload.preferredDelivery)) ? String(payload.preferredDelivery) as "workplace" : "workplace", updatedAt }).where(eq(celebrationProfiles.id, invite.profile.id));
  await invite.db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: invite.organization.id, actorId: "employee-invite-token", action: "celebration_profile.updated", entityType: "celebration_profile", entityId: invite.profile.id, metadata: JSON.stringify({ completeness, privacyMode: payload.privacyMode }), createdAt: updatedAt });
  return Response.json({ ok: true, completeness });
}
