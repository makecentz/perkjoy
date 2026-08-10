import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type AdminAnalytics = Awaited<ReturnType<typeof getAdminAnalytics>>;

function rows<T>(result: { data: T[] | null; error: { message: string } | null }, label: string) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
}

export async function getAdminAnalytics() {
  const client = createAdminSupabaseClient();
  const results = await Promise.all([
    client.from("organizations").select("id"),
    client.from("subscriptions").select("subscription_status,monthly_recurring_revenue"),
    client.from("employees").select("id,status"),
    client.from("employee_events").select("status"),
    client.from("rewards").select("amount"),
    client.from("local_gift_orders").select("product_id,customer_amount,vendor_cost,delivery_fee,status,created_at"),
    client.from("vendor_products").select("id,vendor_id,platform_fee"),
    client.from("marketplace_listings").select("product_id,rating"),
    client.from("concierge_requests").select("status,service_fee"),
    client.from("approval_requests").select("status"),
    client.from("vendors").select("id,business_name"),
  ]);
  const organizations = rows(results[0], "Loading organizations");
  const subscriptions = rows(results[1], "Loading subscriptions");
  const employees = rows(results[2], "Loading employees");
  const events = rows(results[3], "Loading employee events");
  const rewards = rows(results[4], "Loading rewards");
  const orders = rows(results[5], "Loading local orders");
  const products = rows(results[6], "Loading vendor products");
  const listings = rows(results[7], "Loading marketplace listings");
  const concierge = rows(results[8], "Loading concierge requests");
  const approvals = rows(results[9], "Loading approval requests");
  const vendors = rows(results[10], "Loading vendors");
  const activeSubscriptions = subscriptions.filter((item) => item.subscription_status === "active");
  const completedStatuses = new Set(["scheduled", "handled", "delivered"]);
  const successfulOrderStatuses = new Set(["paid", "awaiting_confirmation", "vendor_confirmed", "preparing", "out_for_delivery", "delivered"]);
  const failedOrderStatuses = new Set(["failed", "issue", "cancelled", "refunded"]);
  const weekAgo = Date.now() - 7 * 86400000;
  const localGmvCents = orders.reduce((sum, order) => sum + order.customer_amount, 0);
  const marketplaceRevenueCents = orders.reduce((sum, order) => sum + (products.find((product) => product.id === order.product_id)?.platform_fee ?? 0), 0);
  const grossMarginCents = orders.reduce((sum, order) => sum + Math.max(0, order.customer_amount - order.vendor_cost - order.delivery_fee), 0);
  const vendorPerformance = vendors.map((vendor) => {
    const productIds = products.filter((product) => product.vendor_id === vendor.id).map((product) => product.id);
    const vendorOrders = orders.filter((order) => productIds.includes(order.product_id));
    const ratings = listings.filter((listing) => productIds.includes(listing.product_id) && listing.rating !== null).map((listing) => Number(listing.rating));
    const successful = vendorOrders.filter((order) => successfulOrderStatuses.has(order.status)).length;
    return {
      vendorName: vendor.business_name,
      orders: vendorOrders.length,
      rating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
      successRate: vendorOrders.length ? Math.round(successful / vendorOrders.length * 100) : 100,
      gmvCents: vendorOrders.reduce((sum, order) => sum + order.customer_amount, 0),
    };
  }).filter((vendor) => vendor.orders > 0).sort((a, b) => b.gmvCents - a.gmvCents || (b.rating ?? 0) - (a.rating ?? 0));

  return {
    metrics: {
      mrrCents: activeSubscriptions.reduce((sum, item) => sum + item.monthly_recurring_revenue, 0),
      activeOrganizations: activeSubscriptions.length,
      trialOrganizations: subscriptions.filter((item) => item.subscription_status === "trial").length,
      organizations: organizations.length,
      employeesManaged: employees.filter((item) => item.status === "active").length,
      momentsHandled: events.filter((item) => completedStatuses.has(item.status)).length,
      digitalRewardVolumeCents: rewards.reduce((sum, item) => sum + item.amount, 0),
      localGmvCents,
      marketplaceRevenueCents,
      averageOrderValueCents: orders.length ? Math.round(localGmvCents / orders.length) : 0,
      grossMarginPercent: localGmvCents ? Math.round(grossMarginCents / localGmvCents * 100) : 0,
      conciergeRevenueCents: concierge.filter((item) => ["approved", "ordered", "delivered"].includes(item.status)).reduce((sum, item) => sum + item.service_fee, 0),
      ordersThisWeek: orders.filter((item) => new Date(item.created_at).getTime() >= weekAgo).length,
      failedOrders: orders.filter((item) => failedOrderStatuses.has(item.status)).length,
    },
    queue: {
      approvals: approvals.filter((item) => item.status === "pending").length,
      concierge: concierge.filter((item) => ["submitted", "planning", "recommendation_ready", "awaiting_approval"].includes(item.status)).length,
      localOrders: orders.filter((item) => !["delivered", "cancelled", "refunded"].includes(item.status)).length,
    },
    vendorPerformance,
  };
}
