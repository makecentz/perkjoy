import { authenticateSupabaseRequest } from "@/lib/supabase/request";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MEDIA_BUCKET = "vendor-media";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function requireSuperAdmin(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  return profile.data?.is_super_admin ? auth : null;
}

function textField(data: FormData, key: string) {
  return String(data.get(key) || "").trim();
}

function optionalText(data: FormData, key: string) {
  return textField(data, key) || null;
}

function numberField(data: FormData, key: string, minimum = 0) {
  const value = Number(textField(data, key));
  if (!Number.isFinite(value) || value < minimum) throw new Error(`${key} must be ${minimum} or greater.`);
  return value;
}

function booleanField(data: FormData, key: string) {
  return textField(data, key) === "true";
}

function listField(data: FormData, key: string) {
  return textField(data, key).split(",").map((value) => value.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "vendor";
}

function validateImage(file: File, label: string) {
  if (!allowedImageTypes.has(file.type)) throw new Error(`${label} must be a JPG, PNG, or WebP image.`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${label} must be smaller than 8 MB.`);
}

function fileExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function GET(request: Request) {
  if (!await requireSuperAdmin(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const [vendorResult, productResult, listingResult, marketResult] = await Promise.all([
    admin.from("vendors").select("id,business_name,description,website_url,email,phone,address,city,state,postal_code,logo_url,active,featured,market_id,minimum_notice_hours,service_area,internal_notes,created_at").order("created_at", { ascending: false }),
    admin.from("vendor_products").select("id,vendor_id,active"),
    admin.from("marketplace_listings").select("product_id,active"),
    admin.from("markets").select("id,name,city,state,active").order("name"),
  ]);
  const error = vendorResult.error || productResult.error || listingResult.error || marketResult.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const listingsByProduct = new Map((listingResult.data || []).map((listing) => [listing.product_id, listing.active]));
  const marketNames = new Map((marketResult.data || []).map((market) => [market.id, market.name]));
  const vendors = (vendorResult.data || []).map((vendor) => {
    const products = (productResult.data || []).filter((product) => product.vendor_id === vendor.id);
    return {
      id: vendor.id,
      businessName: vendor.business_name,
      description: vendor.description,
      websiteUrl: vendor.website_url,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      postalCode: vendor.postal_code,
      location: [vendor.city, vendor.state].filter(Boolean).join(", "),
      logoUrl: vendor.logo_url,
      active: vendor.active,
      featured: vendor.featured,
      marketId: vendor.market_id,
      minimumNoticeHours: vendor.minimum_notice_hours,
      serviceAreaNotes: typeof vendor.service_area === "object" && vendor.service_area && !Array.isArray(vendor.service_area) ? String((vendor.service_area as Record<string, unknown>).notes || "") : "",
      internalNotes: vendor.internal_notes,
      marketName: vendor.market_id ? marketNames.get(vendor.market_id) || "Unassigned" : "Unassigned",
      listingCount: products.length,
      activeListingCount: vendor.active ? products.filter((product) => product.active && listingsByProduct.get(product.id)).length : 0,
    };
  });
  return Response.json({ vendors, markets: marketResult.data || [] });
}

export async function POST(request: Request) {
  if (!await requireSuperAdmin(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const data = await request.formData();
  const required = ["businessName", "description", "city", "state", "marketId", "productName", "productDescription", "category"];
  for (const key of required) if (!textField(data, key)) return Response.json({ error: `${key} is required.` }, { status: 400 });

  const logo = data.get("logo");
  const images = data.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (!(logo instanceof File) || logo.size === 0) return Response.json({ error: "A company logo is required." }, { status: 400 });
  if (!images.length) return Response.json({ error: "At least one listing image is required." }, { status: 400 });
  if (images.length > 6) return Response.json({ error: "Upload up to 6 listing images." }, { status: 400 });

  try {
    validateImage(logo, "Company logo");
    images.forEach((image, index) => validateImage(image, `Listing image ${index + 1}`));
    const availableDays = data.getAll("availableDays").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!availableDays.length) throw new Error("Choose at least one available delivery day.");

    const admin = createAdminSupabaseClient();
    const marketId = textField(data, "marketId");
    const market = await admin.from("markets").select("id,name,slug,active").eq("id", marketId).single();
    if (market.error || !market.data) return Response.json({ error: "Choose a valid marketplace." }, { status: 400 });

    const vendorId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const availabilityId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    const upload = async (file: File, path: string) => {
      const result = await admin.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) throw new Error(`Image upload failed: ${result.error.message}`);
      uploadedPaths.push(path);
      return admin.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    };

    let vendorInserted = false;
    try {
      const logoUrl = await upload(logo, `${vendorId}/logo-${crypto.randomUUID()}.${fileExtension(logo)}`);
      const imageUrls: string[] = [];
      for (const image of images) imageUrls.push(await upload(image, `${vendorId}/listings/${crypto.randomUUID()}.${fileExtension(image)}`));

      const customerPrice = numberField(data, "customerPrice");
      const vendorCost = numberField(data, "vendorCost");
      const deliveryCost = numberField(data, "deliveryCost");
      const deliveryFee = numberField(data, "deliveryFee");
      const platformFee = numberField(data, "platformFee");
      const minimumNoticeHours = numberField(data, "minimumNoticeHours");
      const active = booleanField(data, "active");
      const baseSlug = slugify(textField(data, "businessName"));
      const existing = await admin.from("vendors").select("id").eq("slug", baseSlug).maybeSingle();
      const slug = existing.data ? `${baseSlug}-${vendorId.slice(0, 8)}` : baseSlug;
      const serviceArea = { market: market.data.slug, notes: textField(data, "serviceAreaNotes") };

      const vendorResult = await admin.from("vendors").insert({
        id: vendorId,
        business_name: textField(data, "businessName"),
        slug,
        description: textField(data, "description"),
        logo_url: logoUrl,
        website_url: optionalText(data, "websiteUrl"),
        email: optionalText(data, "email"),
        phone: optionalText(data, "phone"),
        address: optionalText(data, "address"),
        city: textField(data, "city"),
        state: textField(data, "state").toUpperCase(),
        postal_code: optionalText(data, "postalCode"),
        market_id: marketId,
        service_area: serviceArea,
        minimum_notice_hours: minimumNoticeHours,
        active,
        featured: booleanField(data, "featured"),
        demo: false,
        internal_notes: optionalText(data, "internalNotes"),
      });
      if (vendorResult.error) throw vendorResult.error;
      vendorInserted = true;

      const productResult = await admin.from("vendor_products").insert({
        id: productId,
        vendor_id: vendorId,
        name: textField(data, "productName"),
        description: textField(data, "productDescription"),
        category: textField(data, "category"),
        image_url: imageUrls[0],
        image_urls: imageUrls,
        retail_price: customerPrice,
        customer_price: customerPrice,
        perkjoy_cost: vendorCost,
        vendor_cost: vendorCost,
        delivery_fee: deliveryFee,
        delivery_cost: deliveryCost,
        platform_fee: platformFee,
        gross_margin: customerPrice - vendorCost - deliveryCost,
        minimum_notice_hours: minimumNoticeHours,
        active,
        options: { notes: textField(data, "optionNotes") },
        service_area: serviceArea,
        serves_people: numberField(data, "servesPeople", 1),
        lead_time_text: optionalText(data, "leadTimeText"),
        rating: numberField(data, "rating"),
        delivery_available: booleanField(data, "deliveryAvailable"),
      });
      if (productResult.error) throw productResult.error;

      const availabilityResult = await admin.from("vendor_availability").insert({
        id: availabilityId,
        vendor_id: vendorId,
        market_id: marketId,
        minimum_notice_hours: minimumNoticeHours,
        available_days: availableDays,
        blackout_dates: listField(data, "blackoutDates"),
        delivery_hours: { start: textField(data, "deliveryStart"), end: textField(data, "deliveryEnd") },
        fulfillment_method: textField(data, "fulfillmentMethod") || "vendor_delivery",
      });
      if (availabilityResult.error) throw availabilityResult.error;

      const listingResult = await admin.from("marketplace_listings").insert({
        product_id: productId,
        market_id: marketId,
        vendor_availability_id: availabilityId,
        rating: numberField(data, "rating"),
        preference_tags: listField(data, "preferenceTags"),
        active,
      });
      if (listingResult.error) throw listingResult.error;
      return Response.json({ vendor: { id: vendorId, businessName: textField(data, "businessName"), active } }, { status: 201 });
    } catch (error) {
      if (vendorInserted) await admin.from("vendors").delete().eq("id", vendorId);
      if (uploadedPaths.length) await admin.storage.from(MEDIA_BUCKET).remove(uploadedPaths);
      throw error;
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add vendor." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!await requireSuperAdmin(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const payload = await request.json() as { vendorId?: string; active?: boolean; details?: { businessName?: string; description?: string; websiteUrl?: string; email?: string; phone?: string; address?: string; city?: string; state?: string; postalCode?: string; marketId?: string; minimumNoticeHours?: number; serviceAreaNotes?: string; internalNotes?: string; featured?: boolean; active?: boolean } };
  if (!payload.vendorId) return Response.json({ error: "Vendor is required." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const update = payload.details ? {
    business_name: payload.details.businessName?.trim(), description: payload.details.description?.trim(), website_url: payload.details.websiteUrl?.trim() || null,
    email: payload.details.email?.trim() || null, phone: payload.details.phone?.trim() || null, address: payload.details.address?.trim() || null,
    city: payload.details.city?.trim(), state: payload.details.state?.trim().toUpperCase(), postal_code: payload.details.postalCode?.trim() || null,
    market_id: payload.details.marketId, minimum_notice_hours: payload.details.minimumNoticeHours, service_area: { notes: payload.details.serviceAreaNotes?.trim() || "" },
    internal_notes: payload.details.internalNotes?.trim() || null, featured: Boolean(payload.details.featured), active: Boolean(payload.details.active),
  } : { active: payload.active };
  if (payload.details && (!update.business_name || !update.description || !update.city || !update.state || !update.market_id || typeof update.minimum_notice_hours !== "number" || update.minimum_notice_hours < 0)) return Response.json({ error: "Name, description, location, marketplace, and notice time are required." }, { status: 400 });
  if (!payload.details && typeof payload.active !== "boolean") return Response.json({ error: "Vendor status is required." }, { status: 400 });
  const vendorResult = await admin.from("vendors").update(update).eq("id", payload.vendorId).select("id").single();
  if (vendorResult.error) return Response.json({ error: vendorResult.error.message }, { status: 500 });
  return Response.json({ vendorId: payload.vendorId });
}
