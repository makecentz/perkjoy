import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

async function authorized(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return false;
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  return Boolean(profile.data?.is_super_admin);
}

export async function GET(request: Request) {
  if (!await authorized(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const [organizations, settings, employees, orders, rewards, subscriptions] = await Promise.all([
    admin.from("organizations").select("id,name,city,state,postal_code,timezone,created_at").order("created_at", { ascending: false }),
    admin.from("organization_settings").select("organization_id,monthly_budget,default_reward_amount,prevent_above_budget"),
    admin.from("employees").select("organization_id,status"),
    admin.from("local_gift_orders").select("organization_id,customer_amount,delivery_fee,created_at,status"),
    admin.from("rewards").select("organization_id,amount,created_at,status"),
    admin.from("subscriptions").select("organization_id,subscription_status,monthly_recurring_revenue,current_period_end"),
  ]);
  const error = organizations.error || settings.error || employees.error || orders.error || rewards.error || subscriptions.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const clients = (organizations.data || []).map((org) => {
    const config = settings.data?.find((item) => item.organization_id === org.id);
    const staff = employees.data?.filter((item) => item.organization_id === org.id) || [];
    const clientOrders = orders.data?.filter((item) => item.organization_id === org.id) || [];
    const clientRewards = rewards.data?.filter((item) => item.organization_id === org.id) || [];
    const spentThisMonth = clientOrders.filter((item) => new Date(item.created_at) >= monthStart && item.status !== "cancelled").reduce((sum, item) => sum + item.customer_amount + item.delivery_fee, 0)
      + clientRewards.filter((item) => new Date(item.created_at) >= monthStart && item.status !== "failed" && item.status !== "cancelled").reduce((sum, item) => sum + item.amount, 0);
    const budget = config?.monthly_budget || 0;
    const subscription = subscriptions.data?.find((item) => item.organization_id === org.id);
    return {
      id: org.id, name: org.name, city: org.city, state: org.state, postalCode: org.postal_code, timezone: org.timezone,
      monthlyBudget: budget, spentThisMonth, remainingBudget: budget - spentThisMonth,
      employeeCount: staff.length, activeEmployeeCount: staff.filter((item) => item.status === "active").length,
      orderCount: clientOrders.length, totalOrderValue: clientOrders.reduce((sum, item) => sum + item.customer_amount + item.delivery_fee, 0),
      defaultRewardAmount: config?.default_reward_amount || 0, preventAboveBudget: config?.prevent_above_budget ?? true,
      subscriptionStatus: subscription?.subscription_status || "none", monthlyRecurringRevenue: subscription?.monthly_recurring_revenue || 0,
    };
  });
  return Response.json({ clients });
}

export async function PATCH(request: Request) {
  if (!await authorized(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const body = await request.json() as { organizationId?: string; name?: string; city?: string; state?: string; postalCode?: string; timezone?: string; monthlyBudget?: number; defaultRewardAmount?: number; preventAboveBudget?: boolean };
  if (!body.organizationId || !body.name?.trim()) return Response.json({ error: "Organization and company name are required." }, { status: 400 });
  if (![body.monthlyBudget, body.defaultRewardAmount].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) return Response.json({ error: "Budget values must be zero or greater." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const orgUpdate = await admin.from("organizations").update({ name: body.name.trim(), city: body.city?.trim() || null, state: body.state?.trim().toUpperCase() || null, postal_code: body.postalCode?.trim() || null, timezone: body.timezone?.trim() || "America/New_York" }).eq("id", body.organizationId).select("id").single();
  if (orgUpdate.error) return Response.json({ error: orgUpdate.error.message }, { status: 500 });
  const settingsUpdate = await admin.from("organization_settings").upsert({ organization_id: body.organizationId, monthly_budget: body.monthlyBudget!, default_reward_amount: body.defaultRewardAmount!, prevent_above_budget: body.preventAboveBudget ?? true }, { onConflict: "organization_id" });
  if (settingsUpdate.error) return Response.json({ error: settingsUpdate.error.message }, { status: 500 });
  return Response.json({ organizationId: body.organizationId });
}
