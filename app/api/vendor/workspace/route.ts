import { authenticateSupabaseRequest } from "@/lib/supabase/request";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureVendorAccount } from "@/lib/supabase/vendor-account";

async function vendorFor(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const membership = await auth.client.from("vendor_members").select("vendor_id,role").eq("user_id", auth.user.id).limit(1).maybeSingle();
  if (membership.error) throw membership.error;
  return { auth, vendorId: membership.data?.vendor_id ?? null, role: membership.data?.role ?? null };
}

export async function GET(request: Request) {
  const context = await vendorFor(request);
  if (!context) return Response.json({ error: "Sign in to open your vendor workspace." }, { status: 401 });
  if (!context.vendorId) return Response.json({ error: "This account is not connected to a vendor." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const [vendor, products] = await Promise.all([
    admin.from("vendors").select("id,business_name,email,phone,website_url,description,address,city,state,postal_code,active,stripe_account_id,stripe_details_submitted,stripe_charges_enabled,stripe_payouts_enabled").eq("id", context.vendorId).single(),
    admin.from("vendor_products").select("id,name,category,customer_price,active,image_url").eq("vendor_id", context.vendorId).order("created_at", { ascending: false }),
  ]);
  if (vendor.error || products.error) throw vendor.error || products.error;
  const productIds = products.data.map((item) => item.id);
  const orders = productIds.length
    ? await admin.from("local_gift_orders").select("id,product_id,status,delivery_date,customer_amount,delivery_fee,created_at").in("product_id", productIds).order("created_at", { ascending: false }).limit(50)
    : { data: [], error: null };
  if (orders.error) throw orders.error;
  return Response.json({ vendor: vendor.data, products: products.data, orders: orders.data, role: context.role }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const context = await vendorFor(request);
  if (!context) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = await request.json() as Record<string, unknown>;
  const vendorId = context.vendorId ?? await ensureVendorAccount(context.auth.user, payload);
  const values = {
    business_name: String(payload.businessName ?? "").trim(),
    email: String(payload.email || context.auth.user.email || "").trim() || null,
    phone: String(payload.phone ?? "").trim() || null,
    website_url: String(payload.websiteUrl ?? "").trim() || null,
    description: String(payload.description ?? "").trim() || null,
    address: String(payload.address ?? "").trim() || null,
    city: String(payload.city ?? "").trim(),
    state: String(payload.state ?? "").trim().toUpperCase(),
    postal_code: String(payload.postalCode ?? "").trim() || null,
    service_area: { city: String(payload.city ?? "").trim(), state: String(payload.state ?? "").trim().toUpperCase() },
  };
  if (!values.business_name || !values.city || !values.state) return Response.json({ error: "Add your business name, city, and state." }, { status: 400 });
  const updated = await createAdminSupabaseClient().from("vendors").update(values).eq("id", vendorId).select("id").single();
  if (updated.error) throw updated.error;
  return Response.json({ saved: true, vendorId });
}
