import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const DEFAULT_LOCAL_TRANSACTION_FEE_BPS = 2000;

export async function getPlatformFinancials() {
  const client = createAdminSupabaseClient();
  const [settingsResult, ordersResult, subscriptionsResult, conciergeResult] = await Promise.all([
    client.from("platform_financial_settings").select("local_transaction_fee_bps,updated_at").eq("id", true).single(),
    client.from("local_gift_orders").select("customer_amount,vendor_cost,delivery_fee,platform_fee_amount,status,created_at"),
    client.from("subscriptions").select("subscription_status,monthly_recurring_revenue"),
    client.from("concierge_requests").select("status,service_fee"),
  ]);

  if (settingsResult.error) throw new Error(`Loading platform rate: ${settingsResult.error.message}`);
  if (ordersResult.error) throw new Error(`Loading local order financials: ${ordersResult.error.message}`);
  if (subscriptionsResult.error) throw new Error(`Loading subscriptions: ${subscriptionsResult.error.message}`);
  if (conciergeResult.error) throw new Error(`Loading concierge revenue: ${conciergeResult.error.message}`);

  const orders = ordersResult.data ?? [];
  const settledStatuses = new Set(["paid", "awaiting_confirmation", "vendor_confirmed", "preparing", "out_for_delivery", "delivered"]);
  const settled = orders.filter((order) => settledStatuses.has(order.status));
  const refunded = orders.filter((order) => order.status === "refunded");
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const gmv = sum(settled.map((order) => Number(order.customer_amount) + Number(order.delivery_fee)));
  const merchandiseGmv = sum(settled.map((order) => Number(order.customer_amount)));
  const platformRevenue = sum(settled.map((order) => Number(order.platform_fee_amount)));
  const vendorPayouts = sum(settled.map((order) => Number(order.customer_amount) + Number(order.delivery_fee) - Number(order.platform_fee_amount)));
  const mrr = sum((subscriptionsResult.data ?? []).filter((item) => item.subscription_status === "active").map((item) => Number(item.monthly_recurring_revenue)));
  const conciergeRevenue = sum((conciergeResult.data ?? []).filter((item) => ["approved", "ordered", "delivered"].includes(item.status)).map((item) => Number(item.service_fee)));

  return {
    rateBps: settingsResult.data.local_transaction_fee_bps,
    updatedAt: settingsResult.data.updated_at,
    metrics: {
      grossTransactionVolumeCents: Math.round(gmv * 100),
      merchandiseGmvCents: Math.round(merchandiseGmv * 100),
      platformRevenueCents: Math.round(platformRevenue * 100),
      vendorPayoutsCents: Math.round(vendorPayouts * 100),
      mrrCents: Math.round(mrr * 100),
      conciergeRevenueCents: Math.round(conciergeRevenue * 100),
      refundedVolumeCents: Math.round(sum(refunded.map((order) => Number(order.customer_amount) + Number(order.delivery_fee))) * 100),
      settledOrders: settled.length,
    },
  };
}
