import type { SupabaseClient, User } from "@supabase/supabase-js";
import { automationEventKey, isAutomationDue, ruleMatchesEvent, timingOffsetDays } from "@/lib/automation-engine";
import { getAutomationTemplate } from "@/lib/automation-templates";
import { hashProfileToken, profileToken } from "@/lib/celebration-profile";
import { nextAnniversary, nextBirthday } from "@/lib/celebrations";
import type { Employee, EmployeeEvent, Rule, Workspace } from "@/lib/types";
import { RuleBasedRecommendationProvider } from "@/services/recommendations/CelebrationRecommendationService";
import type { Database, Json } from "./database.types";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type Row<Name extends keyof Tables> = Tables[Name]["Row"];

function cents(value: number | string | null | undefined) {
  return Math.round(Number(value ?? 0) * 100);
}

function dollars(value: unknown) {
  return Number(value ?? 0) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function now() {
  return new Date().toISOString();
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function timing(offset: number) {
  return offset === 0 ? "On the day" : `${offset} day${offset === 1 ? "" : "s"} before`;
}

function jsonObject(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringArray(value: Json | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function requireResult<T>(result: { data: T; error: { message: string } | null }, context: string): NonNullable<T> {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data as NonNullable<T>;
}

async function audit(
  client: Client,
  userId: string,
  organizationId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, Json | undefined> = {},
) {
  requireResult(await client.from("audit_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  }), "Writing the audit log");
}

async function organizationIdFor(client: Client, user: User) {
  const membership = requireResult(await client
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .single(), "Loading organization membership");
  return membership.organization_id;
}

async function loadWorkspace(client: Client, organizationId: string): Promise<Workspace> {
  const results = await Promise.all([
    client.from("organizations").select("*").eq("id", organizationId).single(),
    client.from("organization_settings").select("*").eq("organization_id", organizationId).single(),
    client.from("departments").select("*").eq("organization_id", organizationId),
    client.from("employees").select("id,organization_id,first_name,last_name,email,birthday_month,birthday_day,hire_date,department_id,job_title,manager_employee_id,work_location,recognition_preferences,status,work_mode,preferred_celebration_delivery,organization_location_id,created_at,updated_at").eq("organization_id", organizationId).order("first_name"),
    client.from("automation_rules").select("*").eq("organization_id", organizationId).order("created_at"),
    client.from("recognition_events").select("*").eq("organization_id", organizationId),
    client.from("rewards").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("notifications").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(30),
    client.from("automation_runs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(10),
    client.from("local_gift_orders").select("id,organization_id,employee_id,product_id,delivery_date,options,gift_message,customer_amount,delivery_fee,status,created_at,updated_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("celebration_types").select("*").eq("organization_id", organizationId).order("category"),
    client.from("employee_events").select("*").eq("organization_id", organizationId).order("event_date"),
    client.from("celebration_profiles").select("*").eq("organization_id", organizationId),
    client.from("markets").select("*").order("name"),
    client.from("organization_locations").select("*").eq("organization_id", organizationId),
    client.from("vendors").select("id,business_name,slug,demo,active,market_id").eq("active", true),
    client.from("vendor_products").select("id,vendor_id,name,description,category,image_url,retail_price,delivery_fee,minimum_notice_hours,active,options,service_area,serves_people,lead_time_text,created_at,updated_at,customer_price,rating,delivery_available").eq("active", true),
    client.from("vendor_availability").select("*").order("created_at"),
    client.from("marketplace_listings").select("*").eq("active", true),
    client.from("bundles").select("*").eq("active", true),
    client.from("bundle_items").select("*"),
    client.from("recommendations").select("*").eq("organization_id", organizationId).order("recommendation_score", { ascending: false }),
    client.from("gift_history").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("approval_requests").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("approval_policies").select("*").eq("organization_id", organizationId).order("minimum_amount"),
    client.from("concierge_requests").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("team_celebrations").select("*").eq("organization_id", organizationId).order("event_date"),
    client.from("team_celebration_participants").select("*").eq("organization_id", organizationId),
  ]);

  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
  }

  const organization = results[0].data as Row<"organizations">;
  const settings = results[1].data as Row<"organization_settings">;
  const departments = results[2].data as Row<"departments">[];
  const employees = results[3].data as Row<"employees">[];
  const rules = results[4].data as Row<"automation_rules">[];
  const recognitionEvents = results[5].data as Row<"recognition_events">[];
  const rewards = results[6].data as Row<"rewards">[];
  const notifications = results[7].data as Row<"notifications">[];
  const automationRuns = results[8].data as Row<"automation_runs">[];
  const orders = results[9].data as Row<"local_gift_orders">[];
  const types = results[10].data as Row<"celebration_types">[];
  const events = results[11].data as Row<"employee_events">[];
  const profiles = results[12].data as Row<"celebration_profiles">[];
  const markets = results[13].data as Row<"markets">[];
  const locations = results[14].data as Row<"organization_locations">[];
  const vendors = results[15].data as Pick<Row<"vendors">, "id" | "business_name" | "slug" | "demo" | "active" | "market_id">[];
  const products = results[16].data as Omit<Row<"vendor_products">, "perkjoy_cost" | "vendor_cost" | "gross_margin" | "delivery_cost" | "platform_fee">[];
  const availability = results[17].data as Row<"vendor_availability">[];
  const listings = results[18].data as Row<"marketplace_listings">[];
  const bundles = results[19].data as Row<"bundles">[];
  const bundleItems = results[20].data as Row<"bundle_items">[];
  const recommendations = results[21].data as Row<"recommendations">[];
  const giftHistory = results[22].data as Row<"gift_history">[];
  const approvals = results[23].data as Row<"approval_requests">[];
  const policies = results[24].data as Row<"approval_policies">[];
  const concierge = results[25].data as Row<"concierge_requests">[];
  const teamCelebrations = results[26].data as Row<"team_celebrations">[];
  const participants = results[27].data as Row<"team_celebration_participants">[];

  const departmentName = new Map(departments.map((department) => [department.id, department.name]));
  const employeeRows: Employee[] = employees.map((employee) => ({
    id: employee.id,
    firstName: employee.first_name,
    lastName: employee.last_name,
    email: employee.email,
    department: departmentName.get(employee.department_id ?? "") ?? "General",
    jobTitle: employee.job_title ?? "Team Member",
    birthdayMonth: employee.birthday_month,
    birthdayDay: employee.birthday_day,
    hireDate: employee.hire_date,
    status: employee.status as Employee["status"],
    workMode: employee.work_mode as Employee["workMode"],
    preferredDelivery: employee.preferred_celebration_delivery as Employee["preferredDelivery"],
    locationId: employee.organization_location_id,
  }));

  const vendorName = new Map(vendors.map((vendor) => [vendor.id, vendor.business_name]));
  const productRows = products.flatMap((product) => {
    const listing = listings.find((item) => item.product_id === product.id);
    const schedule = availability.find((item) => item.id === listing?.vendor_availability_id);
    if (!listing || !schedule) return [];
    return [{
      id: product.id,
      vendorName: vendorName.get(product.vendor_id) ?? "PerkJoy Local",
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      priceCents: cents(product.customer_price || product.retail_price),
      deliveryFeeCents: cents(product.delivery_fee),
      servesPeople: product.serves_people ?? 1,
      demo: vendors.find((vendor) => vendor.id === product.vendor_id)?.demo ?? false,
      marketId: listing.market_id,
      rating: Number(listing.rating ?? product.rating ?? 0),
      minimumNoticeHours: schedule.minimum_notice_hours,
      availableDays: schedule.available_days,
      blackoutDates: schedule.blackout_dates,
      fulfillmentMethod: schedule.fulfillment_method as Workspace["products"][number]["fulfillmentMethod"],
      preferenceTags: listing.preference_tags,
    }];
  });

  const prefs = jsonObject(settings.notification_preferences);
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      timezone: organization.timezone,
      monthlyBudgetCents: cents(settings.monthly_budget),
    },
    organizationSettings: {
      reminderDays: settings.reminder_days,
      notificationPreferences: {
        eventReminders: prefs.eventReminders !== false,
        budgetAlerts: prefs.budgetAlerts !== false,
        rewardFailures: prefs.rewardFailures !== false,
        deliveryUpdates: prefs.deliveryUpdates !== false,
      },
      celebrationStyle: settings.celebration_style as Workspace["organizationSettings"]["celebrationStyle"],
      selectedTemplate: settings.selected_template,
      onboardingCompleted: settings.onboarding_completed,
    },
    employees: employeeRows,
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      eventType: rule.event_type,
      rewardType: rule.reward_type,
      amountCents: cents(rule.reward_amount),
      timing: timing(rule.send_offset_days),
      active: rule.active,
      approvalRequired: rule.approval_required,
    })),
    rewards: rewards.map((reward) => {
      const event = recognitionEvents.find((item) => item.id === reward.recognition_event_id);
      return {
        id: reward.id,
        employeeId: reward.employee_id,
        recognitionType: event?.event_type ?? "Recognition",
        message: event ? String(jsonObject(event.metadata).message ?? "A PerkJoy recognition") : "A PerkJoy recognition",
        amountCents: cents(reward.amount),
        status: reward.status,
        provider: reward.provider,
        createdAt: reward.created_at,
      };
    }),
    notifications: notifications.map((item) => ({
      id: item.id,
      type: item.type as Workspace["notifications"][number]["type"],
      title: item.title,
      message: item.body,
      entityType: item.entity_type,
      entityId: item.entity_id,
      actionLabel: item.action_label,
      actionHref: item.action_href,
      readAt: item.read_at,
      createdAt: item.created_at,
    })),
    automationRuns: automationRuns.map((run) => ({
      id: run.id,
      runKey: run.run_key,
      status: run.status as Workspace["automationRuns"][number]["status"],
      rulesEvaluated: run.rules_evaluated,
      momentsEvaluated: run.moments_evaluated,
      scheduledCount: run.scheduled_count,
      approvalCount: run.approval_count,
      duplicateCount: run.duplicate_count,
      createdAt: run.created_at,
    })),
    products: productRows,
    localOrders: orders.map((order) => ({
      id: order.id,
      employeeId: order.employee_id,
      productId: order.product_id,
      deliveryDate: order.delivery_date,
      totalCents: cents(order.customer_amount + order.delivery_fee),
      status: order.status,
      createdAt: order.created_at,
    })),
    celebrationTypes: types.map((type) => ({
      id: type.id,
      organizationId: type.organization_id,
      name: type.name,
      slug: type.slug,
      category: type.category as "career" | "life",
      active: type.active,
      manualOnly: type.manual_only,
    })),
    events: events.map((event) => ({
      id: event.id,
      employeeId: event.employee_id,
      celebrationTypeId: event.celebration_type_id,
      title: event.title,
      eventDate: event.event_date,
      category: event.category as "career" | "life",
      status: event.status as Workspace["events"][number]["status"],
      rewardSummary: event.reward_summary,
      handledSteps: JSON.stringify(stringArray(event.handled_steps)),
    })),
    profiles: profiles.map((profile) => {
      const employee = employees.find((item) => item.id === profile.employee_id);
      return {
        id: profile.id,
        employeeId: profile.employee_id,
        inviteExpiresAt: profile.updated_at,
        completeness: profile.completeness,
        privacyMode: profile.privacy_mode as Workspace["profiles"][number]["privacyMode"],
        workMode: (employee?.work_mode ?? "office") as Workspace["profiles"][number]["workMode"],
        preferredDelivery: profile.preferred_delivery as Workspace["profiles"][number]["preferredDelivery"],
      };
    }),
    markets: markets.map((market) => ({
      id: market.id,
      name: market.name,
      slug: market.slug,
      city: market.city,
      state: market.state,
      country: market.country,
      active: market.active,
      launchStatus: market.launch_status as "active" | "coming_soon",
    })),
    organizationLocations: locations.map((location) => ({
      id: location.id,
      marketId: location.market_id,
      name: location.name,
      locationType: location.location_type as "office" | "remote",
      address: [location.address_line_1, location.address_line_2, location.city, location.state, location.postal_code].filter(Boolean).join(", ") || null,
      active: location.active,
    })),
    employeeLocations: employees.flatMap((employee) => employee.organization_location_id
      ? [{ employeeId: employee.id, organizationLocationId: employee.organization_location_id }]
      : []),
    marketplaceMatches: Object.fromEntries(employeeRows.map((employee) => [employee.id, productRows.map((product) => product.id)])),
    bundles: bundles.map((bundle) => ({
      id: bundle.id,
      marketId: bundle.market_id,
      vendorName: vendorName.get(bundle.vendor_id ?? "") ?? "PerkJoy Fulfillment",
      name: bundle.name,
      description: bundle.description ?? "",
      category: bundle.category,
      customerPriceCents: cents(bundle.customer_price),
      active: bundle.active,
      items: bundleItems.filter((item) => item.bundle_id === bundle.id).map((item) => ({ id: item.id, productId: item.product_id, name: item.item_name, quantity: item.quantity })),
    })),
    recommendations: recommendations.map((recommendation) => ({
      id: recommendation.id,
      employeeId: recommendation.employee_id,
      employeeEventId: recommendation.employee_event_id,
      rewardType: recommendation.reward_type,
      title: recommendation.title,
      amountCents: cents(recommendation.amount),
      recommendationScore: recommendation.recommendation_score,
      recommendationReason: recommendation.recommendation_reason,
      somethingDifferent: recommendation.something_different,
      status: recommendation.status as Workspace["recommendations"][number]["status"],
    })),
    giftHistory: giftHistory.map((gift) => ({
      id: gift.id,
      employeeId: gift.employee_id,
      recommendationId: gift.recommendation_id,
      title: gift.title,
      rewardType: gift.reward_type,
      occasion: gift.occasion,
      amountCents: cents(gift.amount),
      status: gift.status as Workspace["giftHistory"][number]["status"],
      createdAt: gift.created_at,
    })),
    approvals: approvals.map((approval) => ({
      id: approval.id,
      entityType: approval.entity_type,
      entityId: approval.entity_id,
      approvalLevel: approval.approval_level as Workspace["approvals"][number]["approvalLevel"],
      amountCents: cents(approval.amount),
      status: approval.status as Workspace["approvals"][number]["status"],
    })),
    approvalPolicies: policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      rewardType: policy.reward_type,
      minimumCents: cents(policy.minimum_amount),
      maximumCents: policy.maximum_amount === null ? null : cents(policy.maximum_amount),
      approvalLevel: policy.approval_level as Workspace["approvalPolicies"][number]["approvalLevel"],
      active: policy.active,
    })),
    conciergeRequests: concierge.map((request) => ({
      id: request.id,
      employeeId: request.employee_id,
      occasion: request.occasion,
      budgetCents: cents(request.budget),
      deliveryDate: request.delivery_date,
      status: request.status as Workspace["conciergeRequests"][number]["status"],
      recommendation: request.recommendation ? JSON.stringify(request.recommendation) : null,
    })),
    teamCelebrations: teamCelebrations.map((celebration) => ({
      id: celebration.id,
      title: celebration.title,
      eventType: celebration.event_type,
      eventDate: celebration.event_date,
      department: departmentName.get(celebration.department_id ?? "") ?? null,
      rewardMode: celebration.reward_mode as Workspace["teamCelebrations"][number]["rewardMode"],
      budgetCents: cents(celebration.budget),
      status: celebration.status,
      participantEmployeeIds: participants.filter((item) => item.team_celebration_id === celebration.id).map((item) => item.employee_id),
    })),
  };
}

async function departmentId(client: Client, organizationId: string, name: string) {
  const safeName = name.trim() || "General";
  const existing = requireResult(await client.from("departments").select("id").eq("organization_id", organizationId).ilike("name", safeName).limit(1), "Finding the department");
  if (existing[0]) return existing[0].id;
  return requireResult(await client.from("departments").insert({ organization_id: organizationId, name: safeName }).select("id").single(), "Creating the department").id;
}

async function createEmployeeEvents(client: Client, organizationId: string, employee: Employee) {
  const types = requireResult(await client.from("celebration_types").select("id,slug").eq("organization_id", organizationId).in("slug", ["birthday", "work-anniversary"]), "Loading celebration types");
  const birthday = nextBirthday(employee);
  const anniversary = nextAnniversary(employee);
  const rows = [
    {
      organization_id: organizationId,
      employee_id: employee.id,
      celebration_type_id: types.find((type) => type.slug === "birthday")?.id,
      title: `${employee.firstName}'s Birthday`,
      event_date: birthday.toISOString().slice(0, 10),
      category: "life",
    },
    {
      organization_id: organizationId,
      employee_id: employee.id,
      celebration_type_id: types.find((type) => type.slug === "work-anniversary")?.id,
      title: `${employee.firstName} — ${anniversary.years} Year Anniversary`,
      event_date: anniversary.date.toISOString().slice(0, 10),
      category: "career",
    },
  ];
  requireResult(await client.from("employee_events").insert(rows), "Creating employee moments");
}

async function createNotification(client: Client, userId: string, organizationId: string, values: {
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  requireResult(await client.from("notifications").insert({
    organization_id: organizationId,
    user_id: userId,
    type: values.type,
    title: values.title,
    body: values.body,
    channel: "in_app",
    entity_type: values.entityType,
    entity_id: values.entityId,
    action_label: values.actionLabel,
    action_href: values.actionHref,
  }), "Creating the notification");
}

async function createReward(client: Client, user: User, organizationId: string, payload: Record<string, unknown>) {
  const employeeId = String(payload.employeeId ?? "");
  const employee = requireResult(await client.from("employees").select("id,first_name,last_name,email").eq("id", employeeId).eq("organization_id", organizationId).single(), "Finding the employee");
  const amountCents = Number(payload.amountCents ?? 0);
  if (amountCents < 0 || amountCents > 250000) throw new Error("Choose a reward between $0 and $2,500.");
  const recognitionType = String(payload.recognitionType ?? "Great Work");
  const message = String(payload.message ?? "Your work made a real difference.").trim();
  const eventKey = `manual:${organizationId}:${employeeId}:${crypto.randomUUID()}`;
  const event = requireResult(await client.from("recognition_events").insert({
    organization_id: organizationId,
    employee_id: employeeId,
    event_type: recognitionType,
    event_year: new Date().getFullYear(),
    event_key: eventKey,
    event_date: today(),
    status: "scheduled",
    metadata: { message },
  }).select("id").single(), "Creating the recognition event");
  const provider = amountCents > 0 ? "tremendous_sandbox" : "recognition_only";
  const reward = requireResult(await client.from("rewards").insert({
    organization_id: organizationId,
    employee_id: employeeId,
    recognition_event_id: event.id,
    provider,
    amount: dollars(amountCents),
    recipient_name: `${employee.first_name} ${employee.last_name}`,
    recipient_email: employee.email,
    status: "scheduled",
    idempotency_key: eventKey,
    test_mode: true,
  }).select("id").single(), "Scheduling the reward");
  await audit(client, user.id, organizationId, "reward.scheduled", "reward", reward.id, { amountCents, testMode: true });
  await createNotification(client, user.id, organizationId, {
    type: "reward_scheduled",
    title: `${employee.first_name}'s recognition is scheduled`,
    body: amountCents ? "The TEST reward is safely scheduled in Tremendous Sandbox." : "The recognition message is ready.",
    entityType: "reward",
    entityId: reward.id,
    actionLabel: "View rewards",
    actionHref: "/rewards",
  });
}

async function applyTemplate(client: Client, user: User, organizationId: string, templateId: string) {
  const template = getAutomationTemplate(templateId);
  if (!template) throw new Error("Automation template not found.");
  requireResult(await client.from("automation_rules").delete().eq("organization_id", organizationId), "Replacing automation rules");
  requireResult(await client.from("automation_rules").insert(template.rules.map((rule) => ({
    organization_id: organizationId,
    name: rule.name,
    event_type: rule.eventType,
    reward_type: rule.rewardType,
    reward_amount: dollars(rule.amountCents),
    send_offset_days: timingOffsetDays(rule.timing),
    active: true,
    approval_required: rule.approvalRequired,
  }))), "Creating automation rules");
  requireResult(await client.from("organization_settings").update({ selected_template: template.id }).eq("organization_id", organizationId), "Saving the automation template");
  await audit(client, user.id, organizationId, "automation_template.applied", "organization", organizationId, { templateId: template.id });
}

export async function getSupabaseWorkspace(client: Client, user: User) {
  const organizationId = await organizationIdFor(client, user);
  return loadWorkspace(client, organizationId);
}

export async function mutateSupabaseWorkspace(client: Client, user: User, payload: Record<string, unknown>) {
  const organizationId = await organizationIdFor(client, user);
  const action = String(payload.action ?? "");
  let profileInviteUrl: string | undefined;
  let automationResult: { scheduled: number; approvals: number; duplicates: number; evaluated: number } | undefined;

  if (action === "addEmployee") {
    const firstName = String(payload.firstName ?? "").trim();
    const lastName = String(payload.lastName ?? "").trim();
    const email = String(payload.email ?? "").trim().toLowerCase();
    const birthdayMonth = Number(payload.birthdayMonth ?? 0);
    const birthdayDay = Number(payload.birthdayDay ?? 0);
    if (!firstName || !lastName || !email.includes("@") || birthdayMonth < 1 || birthdayMonth > 12 || birthdayDay < 1 || birthdayDay > 31) throw new Error("Add a valid employee name, email, and birthday.");
    const department = await departmentId(client, organizationId, String(payload.department ?? "General"));
    const employee = requireResult(await client.from("employees").insert({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      email,
      birthday_month: birthdayMonth,
      birthday_day: birthdayDay,
      hire_date: String(payload.hireDate ?? today()),
      department_id: department,
      job_title: String(payload.jobTitle ?? "Team Member"),
      work_mode: String(payload.workMode ?? "office"),
      preferred_celebration_delivery: String(payload.preferredDelivery ?? "workplace"),
    }).select("id,hire_date,preferred_celebration_delivery").single(), "Adding the employee");
    requireResult(await client.from("celebration_profiles").insert({
      organization_id: organizationId,
      employee_id: employee.id,
      preferred_delivery: employee.preferred_celebration_delivery,
    }), "Creating the celebration profile");
    await createEmployeeEvents(client, organizationId, {
      id: employee.id, firstName, lastName, email,
      department: String(payload.department ?? "General"),
      jobTitle: String(payload.jobTitle ?? "Team Member"),
      birthdayMonth, birthdayDay, hireDate: employee.hire_date, status: "active",
    });
    await audit(client, user.id, organizationId, "employee.created", "employee", employee.id);
  } else if (action === "recognize" || action === "quickCelebrate") {
    await createReward(client, user, organizationId, payload);
  } else if (action === "generateRecommendation") {
    const employeeId = String(payload.employeeId ?? "");
    const employee = requireResult(await client.from("employees").select("id,first_name,work_mode").eq("id", employeeId).eq("organization_id", organizationId).single(), "Finding the employee");
    const [profileResult, historyResult, eventResult, marketResult] = await Promise.all([
      client.from("celebration_profiles").select("*").eq("employee_id", employeeId).single(),
      client.from("gift_history").select("title").eq("employee_id", employeeId).order("created_at", { ascending: false }),
      client.from("employee_events").select("id,title").eq("employee_id", employeeId).order("event_date").limit(1),
      client.from("markets").select("id").eq("active", true).limit(1),
    ]);
    const profile = requireResult(profileResult, "Loading the celebration profile");
    const history = requireResult(historyResult, "Loading gift history");
    const events = requireResult(eventResult, "Loading the next employee moment");
    const markets = requireResult(marketResult, "Checking local availability");
    const result = new RuleBasedRecommendationProvider().recommend({
      employeeName: employee.first_name,
      occasion: events[0]?.title ?? "Recognition",
      budgetCents: Math.min(250000, Math.max(0, Number(payload.budgetCents ?? 5000))),
      workMode: employee.work_mode as "office" | "remote" | "hybrid",
      preferredDelivery: profile.preferred_delivery as "workplace" | "home" | "digital_only",
      marketActive: markets.length > 0,
      previousGiftTitles: history.map((gift) => gift.title),
      surpriseMe: payload.surpriseMe === true,
    });
    const recommendation = requireResult(await client.from("recommendations").insert({
      organization_id: organizationId,
      employee_id: employeeId,
      employee_event_id: events[0]?.id,
      reward_type: result.rewardType,
      title: result.title,
      amount: dollars(result.amountCents),
      recommendation_score: result.score,
      recommendation_reason: result.reason,
      something_different: result.somethingDifferent,
      status: result.requiresApproval ? "awaiting_approval" : "recommended",
    }).select("id").single(), "Saving the recommendation");
    if (result.requiresApproval) requireResult(await client.from("approval_requests").insert({
      organization_id: organizationId,
      requested_by: user.id,
      entity_type: "recommendation",
      entity_id: recommendation.id,
      approval_level: "admin",
      amount: dollars(result.amountCents),
    }), "Creating the approval request");
    await audit(client, user.id, organizationId, "recommendation.generated", "recommendation", recommendation.id);
  } else if (action === "approveRecommendation") {
    const recommendationId = String(payload.recommendationId ?? "");
    const recommendation = requireResult(await client.from("recommendations").select("*").eq("id", recommendationId).eq("organization_id", organizationId).single(), "Finding the recommendation");
    requireResult(await client.from("recommendations").update({ status: "approved" }).eq("id", recommendationId), "Approving the recommendation");
    requireResult(await client.from("approval_requests").update({ status: "approved", decided_by: user.id, decided_at: now() }).eq("entity_type", "recommendation").eq("entity_id", recommendationId).eq("organization_id", organizationId), "Closing the approval");
    requireResult(await client.from("gift_history").insert({
      organization_id: organizationId,
      employee_id: recommendation.employee_id,
      recommendation_id: recommendation.id,
      title: recommendation.title,
      reward_type: recommendation.reward_type === "concierge" ? "surprise_me" : recommendation.reward_type,
      occasion: "Recognition",
      amount: recommendation.amount,
      status: "scheduled",
    }), "Saving gift history");
    await audit(client, user.id, organizationId, "recommendation.approved", "recommendation", recommendation.id);
  } else if (action === "handleEvent") {
    const eventId = String(payload.eventId ?? "");
    requireResult(await client.from("employee_events").update({ status: "handled", reward_summary: "Celebration plan in progress", handled_steps: ["Plan opened", "Admin notified"] }).eq("id", eventId).eq("organization_id", organizationId), "Handling the celebration");
    await audit(client, user.id, organizationId, "celebration.handled", "employee_event", eventId);
  } else if (action === "toggleCelebrationType") {
    const id = String(payload.typeId ?? "");
    const row = requireResult(await client.from("celebration_types").select("active").eq("id", id).eq("organization_id", organizationId).single(), "Finding the celebration type");
    requireResult(await client.from("celebration_types").update({ active: !row.active }).eq("id", id), "Updating the celebration type");
  } else if (action === "approveRequest" || action === "rejectRequest") {
    const id = String(payload.approvalId ?? "");
    const status = action === "approveRequest" ? "approved" : "rejected";
    requireResult(await client.from("approval_requests").update({ status, decided_by: user.id, decided_at: now() }).eq("id", id).eq("organization_id", organizationId), "Updating the approval request");
    await audit(client, user.id, organizationId, `approval.${status}`, "approval_request", id);
  } else if (action === "toggleApprovalPolicy") {
    const id = String(payload.policyId ?? "");
    const policy = requireResult(await client.from("approval_policies").select("active").eq("id", id).eq("organization_id", organizationId).single(), "Finding the approval policy");
    requireResult(await client.from("approval_policies").update({ active: !policy.active }).eq("id", id), "Updating the approval policy");
  } else if (action === "createTeamCelebration") {
    const participantIds = Array.isArray(payload.participantIds) ? payload.participantIds.map(String) : [];
    if (participantIds.length < 2) throw new Error("Choose at least two participants.");
    const department = String(payload.department ?? "").trim();
    const departmentIdValue = department ? await departmentId(client, organizationId, department) : undefined;
    const budgetCents = Number(payload.budgetCents ?? 0);
    const celebration = requireResult(await client.from("team_celebrations").insert({
      organization_id: organizationId,
      title: String(payload.title ?? "Team celebration"),
      event_type: String(payload.eventType ?? "Team Achievement"),
      event_date: String(payload.eventDate ?? daysFromNow(10)),
      department_id: departmentIdValue,
      participant_employee_ids: participantIds,
      reward_mode: String(payload.rewardMode ?? "team_experience"),
      budget: dollars(budgetCents),
      status: "approval_required",
    }).select("id").single(), "Creating the team celebration");
    requireResult(await client.from("team_celebration_participants").insert(participantIds.map((employeeId) => ({ organization_id: organizationId, team_celebration_id: celebration.id, employee_id: employeeId }))), "Adding celebration participants");
    requireResult(await client.from("approval_requests").insert({ organization_id: organizationId, requested_by: user.id, entity_type: "team_celebration", entity_id: celebration.id, approval_level: "admin", amount: dollars(budgetCents) }), "Requesting team celebration approval");
    await audit(client, user.id, organizationId, "team_celebration.created", "team_celebration", celebration.id);
  } else if (action === "createConcierge") {
    const budgetCents = Number(payload.budgetCents ?? 0);
    if (budgetCents < 2500 || budgetCents > 250000) throw new Error("Choose a concierge budget between $25 and $2,500.");
    const concierge = requireResult(await client.from("concierge_requests").insert({
      organization_id: organizationId,
      employee_id: String(payload.employeeId ?? ""),
      occasion: String(payload.occasion ?? "Custom Celebration"),
      budget: dollars(budgetCents),
      delivery_date: String(payload.deliveryDate ?? daysFromNow(7)),
      status: "submitted",
      service_fee: 49,
    }).select("id").single(), "Creating the concierge request");
    await audit(client, user.id, organizationId, "concierge.submitted", "concierge_request", concierge.id);
  } else if (action === "applyAutomationTemplate") {
    await applyTemplate(client, user, organizationId, String(payload.templateId ?? ""));
  } else if (action === "createRule" || action === "updateRule") {
    const name = String(payload.name ?? "").trim();
    const eventType = String(payload.eventType ?? "").trim();
    const rewardType = String(payload.rewardType ?? "").trim();
    const amountCents = Number(payload.amountCents ?? 0);
    if (!name || !eventType || !rewardType || amountCents < 0 || amountCents > 250000) throw new Error("Add a valid rule name, event, reward, and amount.");
    const values = { name, event_type: eventType, reward_type: rewardType, reward_amount: dollars(amountCents), send_offset_days: timingOffsetDays(String(payload.timing ?? "7 days before")), approval_required: payload.approvalRequired === true };
    if (action === "createRule") {
      const rule = requireResult(await client.from("automation_rules").insert({ organization_id: organizationId, ...values }).select("id").single(), "Creating the automation rule");
      await audit(client, user.id, organizationId, "automation_rule.created", "automation_rule", rule.id);
    } else {
      const ruleId = String(payload.ruleId ?? "");
      requireResult(await client.from("automation_rules").update(values).eq("id", ruleId).eq("organization_id", organizationId), "Updating the automation rule");
      requireResult(await client.from("organization_settings").update({ selected_template: null }).eq("organization_id", organizationId), "Clearing the automation template");
      await audit(client, user.id, organizationId, "automation_rule.updated", "automation_rule", ruleId);
    }
  } else if (action === "deleteRule") {
    const ruleId = String(payload.ruleId ?? "");
    requireResult(await client.from("automation_rules").delete().eq("id", ruleId).eq("organization_id", organizationId), "Deleting the automation rule");
    await audit(client, user.id, organizationId, "automation_rule.deleted", "automation_rule", ruleId);
  } else if (action === "toggleRule") {
    const ruleId = String(payload.ruleId ?? "");
    const rule = requireResult(await client.from("automation_rules").select("active").eq("id", ruleId).eq("organization_id", organizationId).single(), "Finding the automation rule");
    requireResult(await client.from("automation_rules").update({ active: !rule.active }).eq("id", ruleId), "Updating the automation rule");
  } else if (action === "runAutomation") {
    const [ruleResult, eventResult, rewardResult, typeResult, employeeResult] = await Promise.all([
      client.from("automation_rules").select("*").eq("organization_id", organizationId).eq("active", true),
      client.from("employee_events").select("*").eq("organization_id", organizationId),
      client.from("rewards").select("idempotency_key").eq("organization_id", organizationId),
      client.from("celebration_types").select("id,name").eq("organization_id", organizationId),
      client.from("employees").select("id,first_name,last_name,email").eq("organization_id", organizationId),
    ]);
    const rules = requireResult(ruleResult, "Loading automation rules");
    const events = requireResult(eventResult, "Loading employee moments");
    const existing = new Set(requireResult(rewardResult, "Loading reward keys").map((reward) => reward.idempotency_key));
    const types = requireResult(typeResult, "Loading celebration types");
    const employees = requireResult(employeeResult, "Loading employees");
    let scheduled = 0; let approvals = 0; let duplicates = 0; let evaluated = 0;
    for (const ruleRow of rules) {
      const rule: Rule = { id: ruleRow.id, name: ruleRow.name, eventType: ruleRow.event_type, rewardType: ruleRow.reward_type, amountCents: cents(ruleRow.reward_amount), timing: timing(ruleRow.send_offset_days), active: ruleRow.active, approvalRequired: ruleRow.approval_required };
      for (const eventRow of events) {
        const event: EmployeeEvent = { id: eventRow.id, employeeId: eventRow.employee_id, celebrationTypeId: eventRow.celebration_type_id, title: eventRow.title, eventDate: eventRow.event_date, category: eventRow.category as "career" | "life", status: eventRow.status as EmployeeEvent["status"], rewardSummary: eventRow.reward_summary, handledSteps: JSON.stringify(eventRow.handled_steps) };
        const typeName = types.find((type) => type.id === eventRow.celebration_type_id)?.name;
        if (!ruleMatchesEvent(rule, event, typeName) || !isAutomationDue(event.eventDate, rule.timing) || ["delivered", "skipped"].includes(event.status)) continue;
        evaluated += 1;
        const key = automationEventKey(organizationId, event.employeeId, event.eventDate, rule.id);
        if (existing.has(key)) { duplicates += 1; continue; }
        const employee = employees.find((item) => item.id === event.employeeId);
        if (!employee) continue;
        const reward = requireResult(await client.from("rewards").insert({
          organization_id: organizationId,
          employee_id: employee.id,
          provider: rule.rewardType.toLowerCase().includes("local") ? "local_operations" : rule.amountCents ? "tremendous_sandbox" : "recognition_only",
          amount: dollars(rule.amountCents),
          recipient_name: `${employee.first_name} ${employee.last_name}`,
          recipient_email: employee.email,
          status: rule.approvalRequired ? "pending_approval" : "scheduled",
          idempotency_key: key,
          test_mode: true,
        }).select("id").single(), "Scheduling an automated reward");
        if (rule.approvalRequired) {
          approvals += 1;
          requireResult(await client.from("approval_requests").insert({ organization_id: organizationId, requested_by: user.id, entity_type: "reward", entity_id: reward.id, approval_level: "admin", amount: dollars(rule.amountCents) }), "Requesting reward approval");
        } else scheduled += 1;
        requireResult(await client.from("employee_events").update({ status: rule.approvalRequired ? "approval_required" : "scheduled", reward_summary: `${rule.rewardType} · $${Math.round(rule.amountCents / 100)} ${rule.approvalRequired ? "awaiting approval" : "scheduled"}`, handled_steps: rule.approvalRequired ? ["Rule matched", "Approval requested"] : ["Rule matched", "Reward scheduled", "Duplicate protection active"] }).eq("id", event.id), "Updating the employee moment");
        existing.add(key);
      }
    }
    const run = requireResult(await client.from("automation_runs").insert({ organization_id: organizationId, run_key: `manual:${now()}`, status: approvals ? "completed_with_attention" : "completed", rules_evaluated: rules.length, moments_evaluated: evaluated, scheduled_count: scheduled, approval_count: approvals, duplicate_count: duplicates }).select("id").single(), "Saving the automation run");
    await createNotification(client, user.id, organizationId, { type: "automation_run", title: scheduled + approvals ? `${scheduled + approvals} moments moved forward` : "Automation check complete", body: `${rules.length} active rules checked. ${scheduled} scheduled, ${approvals} awaiting approval, ${duplicates} duplicates safely skipped.`, entityType: "automation_run", entityId: run.id, actionLabel: "Review rules", actionHref: "/rules" });
    await audit(client, user.id, organizationId, "automation.run_completed", "automation_run", run.id, { scheduled, approvals, duplicates, evaluated });
    automationResult = { scheduled, approvals, duplicates, evaluated };
  } else if (action === "markNotificationRead") {
    requireResult(await client.from("notifications").update({ read_at: now() }).eq("id", String(payload.notificationId ?? "")).eq("organization_id", organizationId), "Updating the notification");
  } else if (action === "markAllNotificationsRead") {
    requireResult(await client.from("notifications").update({ read_at: now() }).eq("organization_id", organizationId), "Updating notifications");
  } else if (action === "saveReminderSettings") {
    const allowed = new Set([30, 14, 7, 3, 1]);
    const reminderDays = [...new Set(Array.isArray(payload.reminderDays) ? payload.reminderDays.map(Number).filter((day) => allowed.has(day)) : [])].sort((a, b) => b - a);
    if (!reminderDays.length) throw new Error("Choose at least one reminder day.");
    const preferences = payload.notificationPreferences && typeof payload.notificationPreferences === "object" ? payload.notificationPreferences as Record<string, unknown> : {};
    requireResult(await client.from("organization_settings").update({ reminder_days: reminderDays, notification_preferences: { eventReminders: preferences.eventReminders !== false, budgetAlerts: preferences.budgetAlerts !== false, rewardFailures: preferences.rewardFailures !== false, deliveryUpdates: preferences.deliveryUpdates !== false } }).eq("organization_id", organizationId), "Saving reminder settings");
    await audit(client, user.id, organizationId, "reminders.updated", "organization", organizationId);
  } else if (action === "completeOnboarding") {
    const companyName = String(payload.companyName ?? "").trim();
    const budget = Number(payload.monthlyBudgetCents ?? 0);
    const style = String(payload.celebrationStyle ?? "both");
    const typeIds = Array.isArray(payload.celebrationTypeIds) ? payload.celebrationTypeIds.map(String) : [];
    if (!companyName || budget < 0 || !["digital", "local", "both"].includes(style) || !typeIds.length) throw new Error("Complete every setup step before opening your workspace.");
    requireResult(await client.from("organizations").update({ name: companyName }).eq("id", organizationId), "Saving the company");
    requireResult(await client.from("organization_settings").update({ monthly_budget: dollars(budget), celebration_style: style, onboarding_completed: true }).eq("organization_id", organizationId), "Saving onboarding settings");
    requireResult(await client.from("celebration_types").update({ active: false }).eq("organization_id", organizationId), "Resetting celebration types");
    requireResult(await client.from("celebration_types").update({ active: true }).eq("organization_id", organizationId).in("id", typeIds), "Saving celebration types");
    await applyTemplate(client, user, organizationId, String(payload.templateId ?? ""));
    await audit(client, user.id, organizationId, "onboarding.completed", "organization", organizationId);
  } else if (action === "createOrder") {
    const result = requireResult(await client.rpc("create_perkjoy_local_order", {
      p_employee_id: String(payload.employeeId ?? ""),
      p_product_id: String(payload.productId ?? ""),
      p_delivery_date: String(payload.deliveryDate ?? ""),
      p_gift_message: String(payload.giftMessage ?? "Hope your day is as wonderful as you are."),
    }), "Creating the local gift order");
    await audit(client, user.id, organizationId, "local_order.created", "local_order", result);
  } else if (action === "saveBudget") {
    const budget = Number(payload.monthlyBudgetCents ?? 0);
    if (budget < 0 || budget > 100000000) throw new Error("Enter a valid monthly budget.");
    requireResult(await client.from("organization_settings").update({ monthly_budget: dollars(budget) }).eq("organization_id", organizationId), "Saving the budget");
  } else if (action === "refreshProfileInvite") {
    const employeeId = String(payload.employeeId ?? "");
    const token = profileToken();
    requireResult(await client.from("celebration_profile_invitations").insert({
      organization_id: organizationId,
      employee_id: employeeId,
      token_hash: await hashProfileToken(token),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }), "Creating the profile invitation");
    profileInviteUrl = `/celebrate/${token}`;
  } else {
    throw new Error("Unknown workspace action.");
  }

  return { ...await loadWorkspace(client, organizationId), profileInviteUrl, automationResult };
}
