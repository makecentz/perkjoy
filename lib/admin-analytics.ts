import { ensureDb, getDb } from "@/db";
import {
  approvalRequests,
  conciergeRequests,
  employeeEvents,
  employees,
  localOrders,
  marketplaceListings,
  organizations,
  rewards,
  subscriptions,
  vendorProducts,
} from "@/db/schema";

export type AdminAnalytics = Awaited<ReturnType<typeof getAdminAnalytics>>;

export async function getAdminAnalytics() {
  await ensureDb();
  const db = getDb();
  const [organizationRows, subscriptionRows, employeeRows, eventRows, rewardRows, orderRows, productRows, listingRows, conciergeRows, approvalRows] = await Promise.all([
    db.select().from(organizations),
    db.select().from(subscriptions),
    db.select().from(employees),
    db.select().from(employeeEvents),
    db.select().from(rewards),
    db.select().from(localOrders),
    db.select().from(vendorProducts),
    db.select().from(marketplaceListings),
    db.select().from(conciergeRequests),
    db.select().from(approvalRequests),
  ]);
  const activeSubscriptions = subscriptionRows.filter((item) => item.status === "active");
  const completedStatuses = new Set(["scheduled", "handled", "delivered"]);
  const successfulOrderStatuses = new Set(["paid", "awaiting_confirmation", "vendor_confirmed", "preparing", "out_for_delivery", "delivered"]);
  const failedOrderStatuses = new Set(["failed", "issue", "cancelled", "refunded"]);
  const weekAgo = Date.now() - 7 * 86400000;
  const localGmvCents = orderRows.reduce((sum, order) => sum + order.totalCents, 0);
  const marketplaceRevenueCents = orderRows.reduce((sum, order) => sum + (productRows.find((product) => product.id === order.productId)?.platformFeeCents ?? 0), 0);
  const grossMarginCents = orderRows.reduce((sum, order) => { const product = productRows.find((item) => item.id === order.productId); return sum + (product ? Math.max(0, order.totalCents - product.vendorCostCents - product.deliveryCostCents) : 0); }, 0);
  const vendorPerformance = [...new Set(productRows.map((product) => product.vendorName))].map((vendorName) => {
    const products = productRows.filter((product) => product.vendorName === vendorName);
    const productIds = products.map((product) => product.id);
    const orders = orderRows.filter((order) => productIds.includes(order.productId));
    const ratings = listingRows.filter((listing) => productIds.includes(listing.productId)).map((listing) => listing.ratingTenths / 10);
    const successful = orders.filter((order) => successfulOrderStatuses.has(order.status)).length;
    return { vendorName, orders: orders.length, rating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null, successRate: orders.length ? Math.round(successful / orders.length * 100) : 100, gmvCents: orders.reduce((sum, order) => sum + order.totalCents, 0) };
  }).sort((a, b) => b.gmvCents - a.gmvCents || (b.rating ?? 0) - (a.rating ?? 0));

  return {
    metrics: {
      mrrCents: activeSubscriptions.reduce((sum, item) => sum + item.monthlyRecurringRevenueCents, 0),
      activeOrganizations: activeSubscriptions.length,
      trialOrganizations: subscriptionRows.filter((item) => item.status === "trial").length,
      organizations: organizationRows.length,
      employeesManaged: employeeRows.filter((item) => item.status === "active").length,
      momentsHandled: eventRows.filter((item) => completedStatuses.has(item.status)).length,
      digitalRewardVolumeCents: rewardRows.reduce((sum, item) => sum + item.amountCents, 0),
      localGmvCents,
      marketplaceRevenueCents,
      averageOrderValueCents: orderRows.length ? Math.round(localGmvCents / orderRows.length) : 0,
      grossMarginPercent: localGmvCents ? Math.round(grossMarginCents / localGmvCents * 100) : 0,
      conciergeRevenueCents: conciergeRows.filter((item) => ["approved", "ordered", "delivered"].includes(item.status)).reduce((sum, item) => sum + item.serviceFeeCents, 0),
      ordersThisWeek: orderRows.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length,
      failedOrders: orderRows.filter((item) => failedOrderStatuses.has(item.status)).length,
    },
    queue: {
      approvals: approvalRows.filter((item) => item.status === "pending").length,
      concierge: conciergeRows.filter((item) => ["submitted", "planning", "recommendation_ready", "awaiting_approval"].includes(item.status)).length,
      localOrders: orderRows.filter((item) => !["delivered", "cancelled", "refunded"].includes(item.status)).length,
    },
    vendorPerformance,
  };
}
