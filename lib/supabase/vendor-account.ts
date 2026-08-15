import type { User } from "@supabase/supabase-js";
import type { Json } from "./database.types";
import { createAdminSupabaseClient } from "./admin";

function slug(name: string, userId: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vendor"}-${userId.replaceAll("-", "").slice(0, 8)}`;
}

export async function ensureVendorAccount(user: User, input: Record<string, unknown> = {}) {
  const admin = createAdminSupabaseClient();
  const existing = await admin.from("vendor_members").select("vendor_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.vendor_id;

  const metadata = user.user_metadata ?? {};
  const businessName = String(input.businessName || metadata.business_name || metadata.company_name || "My PerkJoy Local business").trim();
  const city = String(input.city || metadata.city || "").trim();
  const state = String(input.state || metadata.state || "").trim().toUpperCase();
  const vendor = await admin.from("vendors").insert({
    business_name: businessName,
    slug: slug(businessName, user.id),
    email: user.email ?? null,
    city,
    state,
    postal_code: String(input.postalCode || metadata.postal_code || "").trim() || null,
    service_area: { city, state } as Json,
    active: false,
    demo: false,
  }).select("id").single();
  if (vendor.error) throw vendor.error;
  const member = await admin.from("vendor_members").insert({ vendor_id: vendor.data.id, user_id: user.id, role: "OWNER" });
  if (member.error) throw member.error;
  return vendor.data.id;
}
