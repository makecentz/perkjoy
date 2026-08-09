import { and, desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import {
  approvalRequests,
  approvalPolicies,
  auditLogs,
  automationRules,
  bundleItems,
  bundles,
  celebrationPreferences,
  celebrationProfiles,
  celebrationTypes,
  conciergeRequests,
  employeeEvents,
  employees,
  employeeLocations,
  giftHistory,
  localOrders,
  markets,
  marketplaceListings,
  organizationLocations,
  organizations,
  recommendations,
  rewards,
  subscriptions,
  teamCelebrations,
  teamCelebrationParticipants,
  vendorAvailability,
  vendorProducts,
} from "@/db/schema";
import { hashProfileToken, profileToken } from "@/lib/celebration-profile";
import { RuleBasedRecommendationProvider } from "@/services/recommendations/CelebrationRecommendationService";

function identity(request: Request) {
  const id = request.headers.get("oai-authenticated-user-id");
  const host = new URL(request.url).hostname;
  if (id) return id;
  if (host === "localhost" || host === "127.0.0.1") return "local-demo-user";
  return null;
}

function now() { return new Date().toISOString(); }
function daysFromNow(days: number) { return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10); }

const celebrationCatalog = [
  ["Birthday", "birthday", "life", false], ["Work Anniversary", "work-anniversary", "career", false],
  ["New Hire", "new-hire", "career", false], ["Promotion", "promotion", "career", false],
  ["Retirement", "retirement", "career", true], ["Certification", "certification", "career", true],
  ["Project Completion", "project-completion", "career", true], ["Sales Goal", "sales-goal", "career", true],
  ["Employee of the Month", "employee-of-the-month", "career", true], ["Customer Praise", "customer-praise", "career", true],
  ["Above & Beyond", "above-and-beyond", "career", true], ["Team Achievement", "team-achievement", "career", true],
  ["New Baby", "new-baby", "life", true], ["Wedding", "wedding", "life", true],
  ["Graduation", "graduation", "life", true], ["Holiday", "holiday", "life", true],
  ["Custom Milestone", "custom-milestone", "life", true],
] as const;

async function ensureProducts() {
  const db = getDb();
  const catalog = [
    { id: "demo-cake", vendorName: "Demo Philadelphia Bakery", name: "Chocolate Celebration Cake", description: "A six-inch chocolate cake with joyful buttercream and a handwritten card.", category: "Cakes & Treats", priceCents: 4900, deliveryFeeCents: 1200, servesPeople: 10, demo: true, vendorCostCents: 2900, deliveryCostCents: 900, platformFeeCents: 1100 },
    { id: "demo-cupcakes", vendorName: "Demo Philadelphia Bakery", name: "Office Birthday Cupcakes", description: "Twenty-four confetti cupcakes with a personalized celebration card.", category: "Cakes & Treats", priceCents: 8900, deliveryFeeCents: 1200, servesPeople: 24, demo: true, vendorCostCents: 5700, deliveryCostCents: 900, platformFeeCents: 2300 },
    { id: "demo-box", vendorName: "Demo Philadelphia Confectioner", name: "Team Treat Box", description: "Cookies, brownies, and locally made sweets packed for sharing.", category: "Gift Boxes", priceCents: 5600, deliveryFeeCents: 900, servesPeople: 8, demo: true, vendorCostCents: 3500, deliveryCostCents: 700, platformFeeCents: 1400 },
    { id: "demo-flowers", vendorName: "Demo Philadelphia Florist", name: "Bright Day Bouquet", description: "Seasonal flowers arranged for a desk, home office, or celebration table.", category: "Flowers", priceCents: 6200, deliveryFeeCents: 1400, servesPeople: 1, demo: true, vendorCostCents: 3800, deliveryCostCents: 1000, platformFeeCents: 1400 },
    { id: "demo-lunch", vendorName: "Demo Philadelphia Kitchen", name: "Team Lunch Spread", description: "A flexible team lunch with salads, sandwiches, dessert, and delivery.", category: "Food & Lunch", priceCents: 14900, deliveryFeeCents: 1800, servesPeople: 12, demo: true, vendorCostCents: 9800, deliveryCostCents: 1300, platformFeeCents: 3800 },
    { id: "demo-coffee", vendorName: "Demo Philadelphia Roaster", name: "Coffee & Pastry Drop", description: "Fresh coffee and pastries delivered for a warm team welcome.", category: "Coffee", priceCents: 7400, deliveryFeeCents: 1100, servesPeople: 8, demo: true, vendorCostCents: 4700, deliveryCostCents: 800, platformFeeCents: 1900 },
  ];
  const existing = await db.select({ id: vendorProducts.id }).from(vendorProducts);
  const missing = catalog.filter((product) => !existing.some((item) => item.id === product.id));
  if (missing.length) await db.insert(vendorProducts).values(missing);
  for (const product of catalog.filter((item) => existing.some((row) => row.id === item.id))) await db.update(vendorProducts).set({ vendorCostCents: product.vendorCostCents, deliveryCostCents: product.deliveryCostCents, platformFeeCents: product.platformFeeCents }).where(eq(vendorProducts.id, product.id));
}

async function ensureDifferentiationData(organizationId: string) {
  const db = getDb();
  const createdAt = now();
  const employeeRows = await db.select().from(employees).where(eq(employees.organizationId, organizationId));
  if (!employeeRows.length) return;

  const existingMarkets = await db.select().from(markets).limit(1);
  if (!existingMarkets.length) {
    await db.insert(markets).values([
      { id: "market-philadelphia", name: "Philadelphia", slug: "philadelphia", city: "Philadelphia", state: "PA", country: "US", active: true, launchStatus: "active" },
      { id: "market-new-york", name: "New York", slug: "new-york", city: "New York", state: "NY", country: "US", active: false, launchStatus: "coming_soon" },
      { id: "market-baltimore", name: "Baltimore", slug: "baltimore", city: "Baltimore", state: "MD", country: "US", active: false, launchStatus: "coming_soon" },
      { id: "market-washington-dc", name: "Washington DC", slug: "washington-dc", city: "Washington", state: "DC", country: "US", active: false, launchStatus: "coming_soon" },
      { id: "market-atlanta", name: "Atlanta", slug: "atlanta", city: "Atlanta", state: "GA", country: "US", active: false, launchStatus: "coming_soon" },
      { id: "market-chicago", name: "Chicago", slug: "chicago", city: "Chicago", state: "IL", country: "US", active: false, launchStatus: "coming_soon" },
    ]);
  }

  const existingTypes = await db.select().from(celebrationTypes).where(eq(celebrationTypes.organizationId, organizationId)).limit(1);
  if (!existingTypes.length) {
    const typeRows = celebrationCatalog.map(([name, slug, category, manualOnly]) => ({ id: `${organizationId}:${slug}`, organizationId, name, slug, category, manualOnly, active: true, createdAt }));
    for (let index = 0; index < typeRows.length; index += 10) await db.insert(celebrationTypes).values(typeRows.slice(index, index + 10));
  }

  const existingProfiles = await db.select().from(celebrationProfiles).where(eq(celebrationProfiles.organizationId, organizationId));
  if (!existingProfiles.length) {
    const completeness = [80, 100, 65, 45, 35];
    const workModes = ["hybrid", "remote", "office", "hybrid", "office"] as const;
    const deliveries = ["workplace", "digital_only", "workplace", "home", "workplace"] as const;
    await db.insert(celebrationProfiles).values(await Promise.all(employeeRows.map(async (employee, index) => ({
      id: crypto.randomUUID(), organizationId, employeeId: employee.id, inviteTokenHash: await hashProfileToken(profileToken()),
      inviteExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), completeness: completeness[index % completeness.length],
      privacyMode: index === 0 ? "share_with_hr" as const : "recommendations_only" as const,
      workMode: workModes[index % workModes.length], preferredDelivery: deliveries[index % deliveries.length], updatedAt: createdAt,
    }))));
    const sarah = employeeRows.find((employee) => employee.firstName === "Sarah") ?? employeeRows[0];
    const marcus = employeeRows.find((employee) => employee.firstName === "Marcus") ?? employeeRows[1] ?? employeeRows[0];
    await db.insert(celebrationPreferences).values([
      { id: crypto.randomUUID(), organizationId, employeeId: sarah.id, food: JSON.stringify({ cake: "Chocolate", restaurant: "Little Nonna's", lunch: "Italian", drink: "Cold brew" }), rewards: JSON.stringify({ stores: ["Target"], types: ["Food", "Physical Gifts"] }), interests: JSON.stringify(["Food", "Travel", "Books"]), dietary: JSON.stringify(["Vegetarian"]), shareWithHr: true, createdAt, updatedAt: createdAt },
      { id: crypto.randomUUID(), organizationId, employeeId: marcus.id, food: JSON.stringify({ drink: "Coffee", snack: "Dark chocolate" }), rewards: JSON.stringify({ stores: ["Starbucks"], types: ["Gift Cards", "Experiences"] }), interests: JSON.stringify(["Technology", "Gaming", "Music"]), dietary: JSON.stringify(["Prefer Not to Say"]), shareWithHr: false, createdAt, updatedAt: createdAt },
    ]);
  } else {
    for (const profile of existingProfiles) {
      if (!/^[a-f0-9]{64}$/.test(profile.inviteTokenHash)) {
        await db.update(celebrationProfiles).set({ inviteTokenHash: await hashProfileToken(profile.inviteTokenHash), inviteExpiresAt: createdAt, updatedAt: createdAt }).where(eq(celebrationProfiles.id, profile.id));
      }
    }
  }

  const existingEvents = await db.select().from(employeeEvents).where(eq(employeeEvents.organizationId, organizationId)).limit(1);
  if (!existingEvents.length) {
    const person = (name: string, fallback: number) => employeeRows.find((employee) => employee.firstName === name) ?? employeeRows[fallback] ?? employeeRows[0];
    const sarah = person("Sarah", 0); const marcus = person("Marcus", 1); const nicole = person("Nicole", 4); const angela = person("Angela", 2);
    const birthdayType = `${organizationId}:birthday`;
    const anniversaryType = `${organizationId}:work-anniversary`;
    const certificationType = `${organizationId}:certification`;
    await db.insert(employeeEvents).values([
      { id: `${organizationId}:event:sarah`, organizationId, employeeId: sarah.id, celebrationTypeId: birthdayType, title: "Sarah's Birthday", eventDate: daysFromNow(1), category: "life", status: "handled", rewardSummary: "Chocolate cake scheduled", handledSteps: JSON.stringify(["Cake ordered", "Bakery confirmed", "Delivery scheduled", "Manager notified"]), createdAt },
      { id: `${organizationId}:event:marcus`, organizationId, employeeId: marcus.id, celebrationTypeId: anniversaryType, title: "Marcus — 5 Year Anniversary", eventDate: daysFromNow(3), category: "career", status: "scheduled", rewardSummary: "$100 reward scheduled", handledSteps: JSON.stringify(["Reward scheduled", `Sends ${daysFromNow(3)}`]), createdAt },
      { id: `${organizationId}:event:nicole`, organizationId, employeeId: nicole.id, celebrationTypeId: birthdayType, title: "Nicole's Birthday", eventDate: daysFromNow(5), category: "life", status: "needs_attention", rewardSummary: "No celebration configured", handledSteps: "[]", createdAt },
      { id: `${organizationId}:event:angela`, organizationId, employeeId: angela.id, celebrationTypeId: certificationType, title: "Angela — Certification Achievement", eventDate: daysFromNow(8), category: "career", status: "delivered", rewardSummary: "$50 Target reward delivered", handledSteps: JSON.stringify(["Reward approved", "Reward delivered"]), createdAt },
    ]);
  }

  const existingLocations = await db.select().from(organizationLocations).where(eq(organizationLocations.organizationId, organizationId)).limit(1);
  if (!existingLocations.length) {
    await db.insert(organizationLocations).values([
      { id: `${organizationId}:location:philly`, organizationId, marketId: "market-philadelphia", name: "Philadelphia Office", locationType: "office", address: "Center City, Philadelphia, PA", active: true },
      { id: `${organizationId}:location:cherry-hill`, organizationId, marketId: "market-philadelphia", name: "Cherry Hill Office", locationType: "office", address: "Cherry Hill, NJ", active: true },
      { id: `${organizationId}:location:remote`, organizationId, marketId: null, name: "Remote", locationType: "remote", address: null, active: true },
    ]);
  }
  const existingEmployeeLocations = await db.select().from(employeeLocations).where(eq(employeeLocations.organizationId, organizationId)).limit(1);
  if (!existingEmployeeLocations.length) {
    await db.insert(employeeLocations).values(employeeRows.map((employee, index) => ({
      id: `${organizationId}:employee-location:${employee.id}`, organizationId, employeeId: employee.id,
      organizationLocationId: employee.firstName === "Marcus" ? `${organizationId}:location:remote` : index % 3 === 2 ? `${organizationId}:location:cherry-hill` : `${organizationId}:location:philly`, createdAt,
    })));
  }

  const existingBundles = await db.select().from(bundles).limit(1);
  if (!existingBundles.length) {
    await db.insert(bundles).values([
      { id: "bundle-birthday-surprise", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Bakery", name: "Birthday Surprise", description: "Cake, card, balloon bouquet, and delivery.", category: "Birthday", customerPriceCents: 7900, active: true },
      { id: "bundle-office-birthday", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Bakery", name: "Office Birthday", description: "24 cupcakes, personalized card, and delivery.", category: "Birthday", customerPriceCents: 8900, active: true },
      { id: "bundle-team-celebration", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Kitchen", name: "Team Celebration", description: "Lunch, dessert, celebration card, and delivery.", category: "Team", customerPriceCents: 14900, active: true },
      { id: "bundle-big-win", marketId: "market-philadelphia", vendorName: "PerkJoy Fulfillment", name: "Big Win", description: "Team lunch, dessert, and a celebration package.", category: "Achievement", customerPriceCents: 24900, active: true },
    ]);
  }
  const existingBundleItems = await db.select().from(bundleItems).limit(1);
  if (!existingBundleItems.length) {
    await db.insert(bundleItems).values([
      { id: crypto.randomUUID(), bundleId: "bundle-birthday-surprise", productId: "demo-cake", name: "Chocolate cake", quantity: 1 },
      { id: crypto.randomUUID(), bundleId: "bundle-birthday-surprise", productId: null, name: "Personalized card", quantity: 1 },
      { id: crypto.randomUUID(), bundleId: "bundle-birthday-surprise", productId: null, name: "Balloon bouquet", quantity: 1 },
      { id: crypto.randomUUID(), bundleId: "bundle-office-birthday", productId: "demo-cupcakes", name: "Confetti cupcakes", quantity: 24 },
      { id: crypto.randomUUID(), bundleId: "bundle-team-celebration", productId: "demo-lunch", name: "Team lunch spread", quantity: 1 },
      { id: crypto.randomUUID(), bundleId: "bundle-big-win", productId: "demo-lunch", name: "Team lunch", quantity: 1 },
    ]);
  }

  const availabilityCatalog = [
      { id: "availability-demo-bakery", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Bakery", minimumNoticeHours: 48, availableDays: JSON.stringify([1,2,3,4,5,6]), blackoutDates: "[]", deliveryHours: JSON.stringify({ start: "09:00", end: "17:00" }), fulfillmentMethod: "vendor_delivery" },
      { id: "availability-demo-kitchen", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Kitchen", minimumNoticeHours: 72, availableDays: JSON.stringify([1,2,3,4,5]), blackoutDates: "[]", deliveryHours: JSON.stringify({ start: "10:00", end: "15:00" }), fulfillmentMethod: "perkjoy_arranged" },
      { id: "availability-demo-confectioner", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Confectioner", minimumNoticeHours: 48, availableDays: JSON.stringify([1,2,3,4,5,6]), blackoutDates: "[]", deliveryHours: JSON.stringify({ start: "10:00", end: "17:00" }), fulfillmentMethod: "vendor_delivery" },
      { id: "availability-demo-florist", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Florist", minimumNoticeHours: 24, availableDays: JSON.stringify([1,2,3,4,5,6]), blackoutDates: "[]", deliveryHours: JSON.stringify({ start: "09:00", end: "16:00" }), fulfillmentMethod: "third_party" },
      { id: "availability-demo-roaster", marketId: "market-philadelphia", vendorName: "Demo Philadelphia Roaster", minimumNoticeHours: 24, availableDays: JSON.stringify([1,2,3,4,5]), blackoutDates: "[]", deliveryHours: JSON.stringify({ start: "07:00", end: "12:00" }), fulfillmentMethod: "vendor_delivery" },
    ] as const;
  const existingAvailability = await db.select().from(vendorAvailability);
  const missingAvailability = availabilityCatalog.filter((item) => !existingAvailability.some((existing) => existing.id === item.id));
  if (missingAvailability.length) await db.insert(vendorAvailability).values(missingAvailability.map((item) => ({ ...item, fulfillmentMethod: item.fulfillmentMethod as "vendor_delivery" | "perkjoy_arranged" | "pickup" | "third_party" })));
  const existingListings = await db.select().from(marketplaceListings).limit(1);
  if (!existingListings.length) {
    await db.insert(marketplaceListings).values([
      { id: "listing-demo-cake", productId: "demo-cake", marketId: "market-philadelphia", vendorAvailabilityId: "availability-demo-bakery", ratingTenths: 49, preferenceTags: JSON.stringify(["cake", "chocolate", "food", "birthday"]), active: true },
      { id: "listing-demo-cupcakes", productId: "demo-cupcakes", marketId: "market-philadelphia", vendorAvailabilityId: "availability-demo-bakery", ratingTenths: 48, preferenceTags: JSON.stringify(["cake", "dessert", "food", "birthday"]), active: true },
      { id: "listing-demo-box", productId: "demo-box", marketId: "market-philadelphia", vendorAvailabilityId: "availability-demo-confectioner", ratingTenths: 47, preferenceTags: JSON.stringify(["snack", "dessert", "physical gifts"]), active: true },
      { id: "listing-demo-flowers", productId: "demo-flowers", marketId: "market-philadelphia", vendorAvailabilityId: "availability-demo-florist", ratingTenths: 49, preferenceTags: JSON.stringify(["flowers", "physical gifts", "wedding"]), active: true },
      { id: "listing-demo-lunch", productId: "demo-lunch", marketId: "market-philadelphia", vendorAvailabilityId: "availability-demo-kitchen", ratingTenths: 48, preferenceTags: JSON.stringify(["lunch", "restaurant", "food", "team achievement"]), active: true },
      { id: "listing-demo-coffee", productId: "demo-coffee", marketId: "market-philadelphia", vendorAvailabilityId: "availability-demo-roaster", ratingTenths: 49, preferenceTags: JSON.stringify(["coffee", "drink", "food", "new hire"]), active: true },
    ]);
  }

  const existingRecommendations = await db.select().from(recommendations).where(eq(recommendations.organizationId, organizationId)).limit(1);
  if (!existingRecommendations.length) {
    const person = (name: string, fallback: number) => employeeRows.find((employee) => employee.firstName === name) ?? employeeRows[fallback] ?? employeeRows[0];
    await db.insert(recommendations).values([
      { id: `${organizationId}:recommendation:sarah`, organizationId, employeeId: person("Sarah", 0).id, employeeEventId: `${organizationId}:event:sarah`, rewardType: "Local", title: "Chocolate Birthday Cake", amountCents: 4900, recommendationScore: 96, recommendationReason: "Great match — Sarah selected chocolate as her favorite cake flavor.", somethingDifferent: true, status: "approved", createdAt },
      { id: `${organizationId}:recommendation:marcus`, organizationId, employeeId: person("Marcus", 1).id, employeeEventId: `${organizationId}:event:marcus`, rewardType: "Digital", title: "$25 Starbucks", amountCents: 2500, recommendationScore: 91, recommendationReason: "Strong match based on Marcus's private Celebration Profile, work mode, budget, and gift history.", somethingDifferent: true, status: "recommended", createdAt },
      { id: `${organizationId}:recommendation:nicole`, organizationId, employeeId: person("Nicole", 4).id, employeeEventId: `${organizationId}:event:nicole`, rewardType: "Surprise Me", title: "Birthday Surprise bundle", amountCents: 7900, recommendationScore: 82, recommendationReason: "Fits Nicole's workplace delivery preference and the birthday budget.", somethingDifferent: false, status: "awaiting_approval", createdAt },
    ]);
    await db.insert(approvalRequests).values({ id: `${organizationId}:approval:nicole`, organizationId, entityType: "recommendation", entityId: `${organizationId}:recommendation:nicole`, approvalLevel: "admin", amountCents: 7900, status: "pending", createdAt });
  }
  const privateMarcus = employeeRows.find((employee) => employee.firstName === "Marcus");
  if (privateMarcus) await db.update(recommendations).set({ recommendationReason: "Strong match based on Marcus's private Celebration Profile, work mode, budget, and gift history." }).where(and(eq(recommendations.organizationId, organizationId), eq(recommendations.employeeId, privateMarcus.id), eq(recommendations.id, `${organizationId}:recommendation:marcus`)));

  const existingGiftHistory = await db.select().from(giftHistory).where(eq(giftHistory.organizationId, organizationId)).limit(1);
  if (!existingGiftHistory.length) {
    const sarah = employeeRows.find((employee) => employee.firstName === "Sarah") ?? employeeRows[0];
    const marcus = employeeRows.find((employee) => employee.firstName === "Marcus") ?? employeeRows[1] ?? employeeRows[0];
    await db.insert(giftHistory).values([
      { id: `${organizationId}:gift:sarah:2025`, organizationId, employeeId: sarah.id, recommendationId: null, title: "$50 Target digital reward", rewardType: "digital", occasion: "Birthday", amountCents: 5000, status: "delivered", createdAt: new Date(Date.now() - 320 * 86400000).toISOString() },
      { id: `${organizationId}:gift:marcus:2025`, organizationId, employeeId: marcus.id, recommendationId: null, title: "Amazon digital reward", rewardType: "digital", occasion: "Work Anniversary", amountCents: 5000, status: "delivered", createdAt: new Date(Date.now() - 280 * 86400000).toISOString() },
    ]);
  }

  const existingPolicies = await db.select().from(approvalPolicies).where(eq(approvalPolicies.organizationId, organizationId)).limit(1);
  if (!existingPolicies.length) await db.insert(approvalPolicies).values([
    { id: `${organizationId}:policy:digital-auto`, organizationId, name: "Digital rewards under $50", rewardType: "digital", minimumCents: 0, maximumCents: 4999, approvalLevel: "automatic", active: true, createdAt },
    { id: `${organizationId}:policy:manager`, organizationId, name: "$50–$100 celebrations", rewardType: "any", minimumCents: 5000, maximumCents: 10000, approvalLevel: "manager", active: true, createdAt },
    { id: `${organizationId}:policy:admin`, organizationId, name: "Celebrations over $100", rewardType: "any", minimumCents: 10001, maximumCents: null, approvalLevel: "admin", active: true, createdAt },
    { id: `${organizationId}:policy:physical`, organizationId, name: "Physical gifts", rewardType: "local", minimumCents: 0, maximumCents: null, approvalLevel: "admin", active: true, createdAt },
  ]);

  const existingConcierge = await db.select().from(conciergeRequests).where(eq(conciergeRequests.organizationId, organizationId));
  if (!existingConcierge.length) {
    const nicole = employeeRows.find((employee) => employee.firstName === "Nicole") ?? employeeRows[0]; const conciergeId = `${organizationId}:concierge:nicole`;
    await db.insert(conciergeRequests).values({ id: conciergeId, organizationId, employeeId: nicole.id, occasion: "Birthday", budgetCents: 12500, deliveryDate: daysFromNow(10), status: "awaiting_approval", recommendation: JSON.stringify({ title: "Birthday table surprise", summary: "Chocolate cake, bright bouquet, personalized card, and coordinated delivery.", amountCents: 11900 }), serviceFeeCents: 4900, createdAt });
    await db.insert(approvalRequests).values({ id: `${organizationId}:approval:concierge`, organizationId, entityType: "concierge_request", entityId: conciergeId, approvalLevel: "admin", amountCents: 11900, status: "pending", createdAt });
  }
  for (const request of existingConcierge.filter((item) => item.serviceFeeCents === 0)) await db.update(conciergeRequests).set({ serviceFeeCents: 4900 }).where(eq(conciergeRequests.id, request.id));

  const existingTeamCelebrations = await db.select().from(teamCelebrations).where(eq(teamCelebrations.organizationId, organizationId)).limit(1);
  if (!existingTeamCelebrations.length) {
    const teamId = `${organizationId}:team:launch`;
    await db.insert(teamCelebrations).values({ id: teamId, organizationId, title: "Marketing Project Launch", eventType: "Team Achievement", eventDate: daysFromNow(12), department: "Marketing", rewardMode: "team_experience", budgetCents: 17500, status: "approval_required", createdAt });
    await db.insert(teamCelebrationParticipants).values(employeeRows.slice(0,3).map((employee) => ({ id: crypto.randomUUID(), organizationId, teamCelebrationId: teamId, employeeId: employee.id })));
    await db.insert(approvalRequests).values({ id: `${organizationId}:approval:team-launch`, organizationId, entityType: "team_celebration", entityId: teamId, approvalLevel: "admin", amountCents: 17500, status: "pending", createdAt });
  }
  const [teamRow] = await db.select().from(teamCelebrations).where(eq(teamCelebrations.organizationId, organizationId)).limit(1);
  const existingParticipants = await db.select().from(teamCelebrationParticipants).where(eq(teamCelebrationParticipants.organizationId, organizationId)).limit(1);
  if (teamRow && !existingParticipants.length) await db.insert(teamCelebrationParticipants).values(employeeRows.slice(0,3).map((employee) => ({ id: crypto.randomUUID(), organizationId, teamCelebrationId: teamRow.id, employeeId: employee.id })));
  const existingTeamApproval = teamRow ? await db.select().from(approvalRequests).where(and(eq(approvalRequests.organizationId, organizationId), eq(approvalRequests.entityType, "team_celebration"), eq(approvalRequests.entityId, teamRow.id))).limit(1) : [];
  if (teamRow && !existingTeamApproval.length) {
    await db.update(teamCelebrations).set({ status: "approval_required" }).where(eq(teamCelebrations.id, teamRow.id));
    await db.insert(approvalRequests).values({ id: crypto.randomUUID(), organizationId, entityType: "team_celebration", entityId: teamRow.id, approvalLevel: "admin", amountCents: teamRow.budgetCents, status: "pending", createdAt });
  }
}

async function ensureWorkspace(ownerId: string) {
  await ensureDb();
  const db = getDb();
  let [organization] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId)).limit(1);
  const createdAt = now();

  if (!organization) {
    [organization] = await db.insert(organizations).values({ id: crypto.randomUUID(), ownerId, name: "Philly Creative Co.", timezone: "America/New_York", monthlyBudgetCents: 100000, createdAt }).returning();
    const demoEmployees = [
      ["Sarah", "Johnson", "sarah@phillycreative.demo", "Design", "Senior Designer", 8, 10, "2022-04-18"],
      ["Marcus", "Brown", "marcus@phillycreative.demo", "Engineering", "Product Engineer", 11, 4, "2021-08-12"],
      ["Angela", "White", "angela@phillycreative.demo", "Marketing", "Growth Lead", 8, 18, "2021-02-08"],
      ["David", "Thompson", "david@phillycreative.demo", "Operations", "Studio Manager", 9, 2, "2019-10-21"],
      ["Nicole", "Carter", "nicole@phillycreative.demo", "Client Success", "Account Director", 8, 14, "2025-06-30"],
    ] as const;
    const employeeRows = demoEmployees.map(([firstName, lastName, email, department, jobTitle, birthdayMonth, birthdayDay, hireDate]) => ({ id: crypto.randomUUID(), organizationId: organization.id, firstName, lastName, email, department, jobTitle, birthdayMonth, birthdayDay, hireDate, status: "active" as const, createdAt }));
    await db.insert(employees).values(employeeRows);
    await db.insert(automationRules).values([
      { id: crypto.randomUUID(), organizationId: organization.id, name: "Birthday Plus", eventType: "Birthday", rewardType: "Personalized Reward", amountCents: 5000, timing: "7 days before", active: true, approvalRequired: false, createdAt },
      { id: crypto.randomUUID(), organizationId: organization.id, name: "Milestone Company", eventType: "Work Anniversary", rewardType: "Digital Reward", amountCents: 10000, timing: "On the anniversary", active: true, approvalRequired: true, createdAt },
      { id: crypto.randomUUID(), organizationId: organization.id, name: "Local Celebration", eventType: "Birthday", rewardType: "Local Cake or Treat", amountCents: 7900, timing: "3 days before", active: true, approvalRequired: true, createdAt },
    ]);
    await db.insert(rewards).values([
      { id: crypto.randomUUID(), organizationId: organization.id, employeeId: employeeRows[2].id, eventKey: `demo:${organization.id}:angela`, recognitionType: "Above & Beyond", message: "Your work made a real difference.", amountCents: 5000, status: "delivered", provider: "tremendous_sandbox", createdAt },
      { id: crypto.randomUUID(), organizationId: organization.id, employeeId: employeeRows[0].id, eventKey: `demo:${organization.id}:sarah`, recognitionType: "Project Completion", message: "Beautiful work on the summer campaign.", amountCents: 2500, status: "delivered", provider: "tremendous_sandbox", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    ]);
  }

  await ensureProducts();
  await ensureDifferentiationData(organization.id);
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organization.id)).limit(1);
  if (!subscription) await db.insert(subscriptions).values({ id: crypto.randomUUID(), organizationId: organization.id, plan: "Growth", status: "active", monthlyRecurringRevenueCents: 7900, createdAt });
  return organization;
}

async function workspace(organizationId: string) {
  const db = getDb();
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const [employeeRows, ruleRows, rewardRows, productRows, orderRows, typeRows, eventRows, profileRows, preferenceRows, marketRows, locationRows, employeeLocationRows, availabilityRows, listingRows, bundleRows, bundleItemRows, recommendationRows, giftHistoryRows, approvalRows, policyRows, conciergeRows, teamRows, teamParticipantRows] = await Promise.all([
    db.select().from(employees).where(eq(employees.organizationId, organizationId)).orderBy(employees.firstName),
    db.select().from(automationRules).where(eq(automationRules.organizationId, organizationId)).orderBy(automationRules.createdAt),
    db.select().from(rewards).where(eq(rewards.organizationId, organizationId)).orderBy(desc(rewards.createdAt)),
    db.select().from(vendorProducts),
    db.select().from(localOrders).where(eq(localOrders.organizationId, organizationId)).orderBy(desc(localOrders.createdAt)),
    db.select().from(celebrationTypes).where(eq(celebrationTypes.organizationId, organizationId)).orderBy(celebrationTypes.category),
    db.select().from(employeeEvents).where(eq(employeeEvents.organizationId, organizationId)).orderBy(employeeEvents.eventDate),
    db.select().from(celebrationProfiles).where(eq(celebrationProfiles.organizationId, organizationId)),
    db.select().from(celebrationPreferences).where(eq(celebrationPreferences.organizationId, organizationId)),
    db.select().from(markets),
    db.select().from(organizationLocations).where(eq(organizationLocations.organizationId, organizationId)),
    db.select().from(employeeLocations).where(eq(employeeLocations.organizationId, organizationId)),
    db.select().from(vendorAvailability), db.select().from(marketplaceListings).where(eq(marketplaceListings.active, true)),
    db.select().from(bundles).where(eq(bundles.active, true)), db.select().from(bundleItems),
    db.select().from(recommendations).where(eq(recommendations.organizationId, organizationId)).orderBy(desc(recommendations.recommendationScore)),
    db.select().from(giftHistory).where(eq(giftHistory.organizationId, organizationId)).orderBy(desc(giftHistory.createdAt)),
    db.select().from(approvalRequests).where(eq(approvalRequests.organizationId, organizationId)).orderBy(desc(approvalRequests.createdAt)),
    db.select().from(approvalPolicies).where(eq(approvalPolicies.organizationId, organizationId)).orderBy(approvalPolicies.minimumCents),
    db.select().from(conciergeRequests).where(eq(conciergeRequests.organizationId, organizationId)).orderBy(desc(conciergeRequests.createdAt)),
    db.select().from(teamCelebrations).where(eq(teamCelebrations.organizationId, organizationId)).orderBy(teamCelebrations.eventDate),
    db.select().from(teamCelebrationParticipants).where(eq(teamCelebrationParticipants.organizationId, organizationId)),
  ]);
  const marketplaceProducts = productRows.flatMap((product) => {
    const listing = listingRows.find((item) => item.productId === product.id); const availability = availabilityRows.find((item) => item.id === listing?.vendorAvailabilityId);
    return listing && availability ? [{ id: product.id, vendorName: product.vendorName, name: product.name, description: product.description, category: product.category, priceCents: product.priceCents, deliveryFeeCents: product.deliveryFeeCents, servesPeople: product.servesPeople, demo: product.demo, marketId: listing.marketId, rating: listing.ratingTenths / 10, minimumNoticeHours: availability.minimumNoticeHours, availableDays: JSON.parse(availability.availableDays), blackoutDates: JSON.parse(availability.blackoutDates), fulfillmentMethod: availability.fulfillmentMethod, preferenceTags: JSON.parse(listing.preferenceTags) }] : [];
  });
  const marketplaceMatches = Object.fromEntries(employeeRows.map((employee) => {
    const preference = preferenceRows.find((item) => item.employeeId === employee.id); if (!preference) return [employee.id, []];
    const food = Object.values(JSON.parse(preference.food) as Record<string, string>).join(" ").toLowerCase(); const rewards = JSON.stringify(JSON.parse(preference.rewards)).toLowerCase();
    return [employee.id, marketplaceProducts.filter((product) => product.preferenceTags.some((tag) => food.includes(tag) || rewards.includes(tag))).map((product) => product.id)];
  }));
  return {
    organization, employees: employeeRows, rules: ruleRows, rewards: rewardRows, products: marketplaceProducts, localOrders: orderRows,
    celebrationTypes: typeRows, events: eventRows, profiles: profileRows.map((profile) => ({
      id: profile.id, employeeId: profile.employeeId, inviteExpiresAt: profile.inviteExpiresAt, completeness: profile.completeness,
      privacyMode: profile.privacyMode, workMode: profile.workMode, preferredDelivery: profile.preferredDelivery,
    })), markets: marketRows, organizationLocations: locationRows, employeeLocations: employeeLocationRows.map((item) => ({ employeeId: item.employeeId, organizationLocationId: item.organizationLocationId })), marketplaceMatches,
    bundles: bundleRows.map((bundle) => ({ ...bundle, items: bundleItemRows.filter((item) => item.bundleId === bundle.id) })),
    recommendations: recommendationRows, giftHistory: giftHistoryRows, approvals: approvalRows, approvalPolicies: policyRows,
    conciergeRequests: conciergeRows.map((request) => ({ id: request.id, employeeId: request.employeeId, occasion: request.occasion, budgetCents: request.budgetCents, deliveryDate: request.deliveryDate, status: request.status, recommendation: request.recommendation })),
    teamCelebrations: teamRows.map((celebration) => ({ ...celebration, participantEmployeeIds: teamParticipantRows.filter((item) => item.teamCelebrationId === celebration.id).map((item) => item.employeeId) })),
  };
}

export async function GET(request: Request) {
  try {
    const ownerId = identity(request);
    if (!ownerId) return Response.json({ error: "Sign in to open your PerkJoy workspace." }, { status: 401 });
    const organization = await ensureWorkspace(ownerId);
    return Response.json(await workspace(organization.id));
  } catch (error) {
    console.error("workspace_get_failed", error);
    return Response.json({ error: "We couldn't load your workspace. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ownerId = identity(request);
    if (!ownerId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    const organization = await ensureWorkspace(ownerId);
    const payload = await request.json() as Record<string, unknown>;
    const db = getDb();
    const createdAt = now();
    let profileInviteUrl: string | undefined;

    if (payload.action === "addEmployee") {
      const firstName = String(payload.firstName ?? "").trim(); const lastName = String(payload.lastName ?? "").trim(); const email = String(payload.email ?? "").trim().toLowerCase();
      if (!firstName || !lastName || !email.includes("@")) return Response.json({ error: "Add a name and valid work email." }, { status: 400 });
      const id = crypto.randomUUID();
      await db.insert(employees).values({ id, organizationId: organization.id, firstName, lastName, email, department: String(payload.department ?? "General"), jobTitle: String(payload.jobTitle ?? "Team Member"), birthdayMonth: Number(payload.birthdayMonth ?? 1), birthdayDay: Number(payload.birthdayDay ?? 1), hireDate: String(payload.hireDate ?? new Date().toISOString().slice(0, 10)), status: "active", createdAt });
      await db.insert(celebrationProfiles).values({ id: crypto.randomUUID(), organizationId: organization.id, employeeId: id, inviteTokenHash: await hashProfileToken(profileToken()), inviteExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), completeness: 0, privacyMode: "recommendations_only", workMode: String(payload.workMode ?? "office") as "office", preferredDelivery: String(payload.preferredDelivery ?? "workplace") as "workplace", updatedAt: createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "employee.created", entityType: "employee", entityId: id, createdAt });
    } else if (payload.action === "generateRecommendation") {
      const employeeId = String(payload.employeeId ?? "");
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1);
      if (!employee) return Response.json({ error: "Employee not found." }, { status: 404 });
      const [[profile], [preferences], [market], history, [event]] = await Promise.all([
        db.select().from(celebrationProfiles).where(and(eq(celebrationProfiles.employeeId, employeeId), eq(celebrationProfiles.organizationId, organization.id))).limit(1),
        db.select().from(celebrationPreferences).where(and(eq(celebrationPreferences.employeeId, employeeId), eq(celebrationPreferences.organizationId, organization.id))).limit(1),
        db.select().from(markets).where(eq(markets.active, true)).limit(1),
        db.select().from(giftHistory).where(and(eq(giftHistory.employeeId, employeeId), eq(giftHistory.organizationId, organization.id))).orderBy(desc(giftHistory.createdAt)),
        db.select().from(employeeEvents).where(and(eq(employeeEvents.employeeId, employeeId), eq(employeeEvents.organizationId, organization.id))).orderBy(employeeEvents.eventDate).limit(1),
      ]);
      const food = preferences ? JSON.parse(preferences.food) as Record<string, string> : {};
      const rewardPreferences = preferences ? JSON.parse(preferences.rewards) as { stores?: string[]; types?: string[] } : {};
      const interests = preferences ? JSON.parse(preferences.interests) as string[] : [];
      const budgetCents = Math.min(100000, Math.max(0, Number(payload.budgetCents ?? 5000)));
      const result = new RuleBasedRecommendationProvider().recommend({
        employeeName: employee.firstName, occasion: event?.title ?? "Recognition", budgetCents,
        workMode: profile?.workMode ?? "office", preferredDelivery: profile?.preferredDelivery ?? "workplace",
        favoriteCake: food.cake, favoriteStore: rewardPreferences.stores?.[0], favoriteDrink: food.drink,
        preferredRewardTypes: rewardPreferences.types, interests, marketActive: Boolean(market), previousGiftTitles: history.map((gift) => gift.title),
        surpriseMe: payload.surpriseMe === true,
      });
      await db.update(recommendations).set({ status: "rejected" }).where(and(eq(recommendations.organizationId, organization.id), eq(recommendations.employeeId, employeeId), eq(recommendations.status, "recommended")));
      const recommendationId = crypto.randomUUID();
      const recommendationReason = profile?.privacyMode === "share_with_hr" ? result.reason : `Strong match based on ${employee.firstName}'s private Celebration Profile, work mode, budget, and gift history.`;
      await db.insert(recommendations).values({ id: recommendationId, organizationId: organization.id, employeeId, employeeEventId: event?.id ?? null, rewardType: payload.surpriseMe === true ? "Surprise Me" : result.rewardType, title: result.title, amountCents: result.amountCents, recommendationScore: result.score, recommendationReason, somethingDifferent: result.somethingDifferent, status: "recommended", createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "recommendation.generated", entityType: "recommendation", entityId: recommendationId, metadata: JSON.stringify({ rewardType: result.rewardType, score: result.score, surpriseMe: payload.surpriseMe === true }), createdAt });
    } else if (payload.action === "approveRecommendation") {
      const recommendationId = String(payload.recommendationId ?? "");
      const [recommendation] = await db.select().from(recommendations).where(and(eq(recommendations.id, recommendationId), eq(recommendations.organizationId, organization.id))).limit(1);
      if (!recommendation) return Response.json({ error: "Recommendation not found." }, { status: 404 });
      await db.update(recommendations).set({ status: "approved" }).where(eq(recommendations.id, recommendationId));
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "recommendation.approved", entityType: "recommendation", entityId: recommendationId, metadata: JSON.stringify({ purchaseCreated: false }), createdAt });
    } else if (payload.action === "recognize" || payload.action === "quickCelebrate") {
      const employeeId = String(payload.employeeId ?? "");
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1);
      if (!employee) return Response.json({ error: "Employee not found." }, { status: 404 });
      const amountCents = Number(payload.amountCents ?? (payload.action === "quickCelebrate" ? 2500 : 0));
      if (amountCents < 0 || amountCents > 100000) return Response.json({ error: "Reward amount is outside your policy." }, { status: 400 });
      const [recommendation] = payload.recommendationId ? await db.select().from(recommendations).where(and(eq(recommendations.id, String(payload.recommendationId)), eq(recommendations.organizationId, organization.id), eq(recommendations.employeeId, employeeId))).limit(1) : [undefined];
      if (payload.action === "quickCelebrate" && recommendation && ["local", "experience", "surprise me"].includes(recommendation.rewardType.toLowerCase()) && recommendation.status !== "approved") return Response.json({ error: "Approve this physical or experience recommendation before anything is ordered." }, { status: 409 });
      const id = crypto.randomUUID();
      await db.insert(rewards).values({ id, organizationId: organization.id, employeeId, eventKey: `manual:${organization.id}:${id}`, recognitionType: String(payload.recognitionType ?? (payload.action === "quickCelebrate" ? "Quick Celebrate" : "Great Work")), message: String(payload.message ?? "Your work made a real difference. Thank you!"), amountCents, status: amountCents > 0 ? "scheduled" : "sent", provider: amountCents > 0 ? "tremendous_sandbox" : "recognition_only", createdAt });
      if (recommendation) await db.update(recommendations).set({ status: "approved" }).where(eq(recommendations.id, recommendation.id));
      if (payload.action === "quickCelebrate") await db.insert(giftHistory).values({ id: crypto.randomUUID(), organizationId: organization.id, employeeId, recommendationId: recommendation?.id ?? null, title: recommendation?.title ?? (amountCents ? `${amountCents / 100} employee-choice reward` : "Recognition only"), rewardType: recommendation?.rewardType ?? (amountCents ? "digital" : "recognition_only"), occasion: String(payload.recognitionType ?? "Quick Celebrate"), amountCents, status: amountCents > 0 ? "scheduled" : "sent", createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: payload.action === "quickCelebrate" ? "celebration.quick_sent" : "reward.scheduled", entityType: "reward", entityId: id, metadata: JSON.stringify({ amountCents, liveMode: false }), createdAt });
    } else if (payload.action === "handleEvent") {
      const eventId = String(payload.eventId ?? "");
      const [event] = await db.select().from(employeeEvents).where(and(eq(employeeEvents.id, eventId), eq(employeeEvents.organizationId, organization.id))).limit(1);
      if (!event) return Response.json({ error: "Celebration not found." }, { status: 404 });
      await db.update(employeeEvents).set({ status: "scheduled", rewardSummary: "$25 employee-choice reward scheduled", handledSteps: JSON.stringify(["Reward selected", "Delivery scheduled", "Manager notified"]) }).where(eq(employeeEvents.id, eventId));
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "celebration.handled", entityType: "employee_event", entityId: eventId, createdAt });
    } else if (payload.action === "refreshProfileInvite") {
      const employeeId = String(payload.employeeId ?? "");
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1);
      if (!employee) return Response.json({ error: "Employee not found." }, { status: 404 });
      const token = profileToken();
      await db.update(celebrationProfiles).set({ inviteTokenHash: await hashProfileToken(token), inviteExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), updatedAt: createdAt }).where(and(eq(celebrationProfiles.employeeId, employeeId), eq(celebrationProfiles.organizationId, organization.id)));
      profileInviteUrl = `${new URL(request.url).origin}/celebrate/${encodeURIComponent(token)}`;
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "celebration_profile.invited", entityType: "employee", entityId: employeeId, createdAt });
    } else if (payload.action === "toggleCelebrationType") {
      const typeId = String(payload.typeId ?? ""); const [type] = await db.select().from(celebrationTypes).where(and(eq(celebrationTypes.id, typeId), eq(celebrationTypes.organizationId, organization.id))).limit(1);
      if (!type) return Response.json({ error: "Celebration type not found." }, { status: 404 });
      await db.update(celebrationTypes).set({ active: !type.active }).where(eq(celebrationTypes.id, typeId));
    } else if (payload.action === "approveRequest") {
      const approvalId = String(payload.approvalId ?? ""); const [approval] = await db.select().from(approvalRequests).where(and(eq(approvalRequests.id, approvalId), eq(approvalRequests.organizationId, organization.id))).limit(1);
      if (!approval) return Response.json({ error: "Approval request not found." }, { status: 404 });
      await db.update(approvalRequests).set({ status: "approved" }).where(eq(approvalRequests.id, approvalId));
      if (approval.entityType === "recommendation") await db.update(recommendations).set({ status: "approved" }).where(eq(recommendations.id, approval.entityId));
      if (approval.entityType === "concierge_request") await db.update(conciergeRequests).set({ status: "approved" }).where(eq(conciergeRequests.id, approval.entityId));
      if (approval.entityType === "team_celebration") await db.update(teamCelebrations).set({ status: "approved" }).where(eq(teamCelebrations.id, approval.entityId));
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "approval.approved", entityType: approval.entityType, entityId: approval.entityId, metadata: JSON.stringify({ amountCents: approval.amountCents }), createdAt });
    } else if (payload.action === "rejectRequest") {
      const approvalId = String(payload.approvalId ?? ""); const [approval] = await db.select().from(approvalRequests).where(and(eq(approvalRequests.id, approvalId), eq(approvalRequests.organizationId, organization.id), eq(approvalRequests.status, "pending"))).limit(1);
      if (!approval) return Response.json({ error: "Pending approval request not found." }, { status: 404 });
      await db.update(approvalRequests).set({ status: "rejected" }).where(eq(approvalRequests.id, approvalId));
      if (approval.entityType === "recommendation") await db.update(recommendations).set({ status: "rejected" }).where(eq(recommendations.id, approval.entityId));
      if (approval.entityType === "concierge_request") await db.update(conciergeRequests).set({ status: "planning" }).where(eq(conciergeRequests.id, approval.entityId));
      if (approval.entityType === "team_celebration") await db.update(teamCelebrations).set({ status: "changes_requested" }).where(eq(teamCelebrations.id, approval.entityId));
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "approval.changes_requested", entityType: approval.entityType, entityId: approval.entityId, metadata: JSON.stringify({ amountCents: approval.amountCents }), createdAt });
    } else if (payload.action === "toggleApprovalPolicy") {
      const policyId = String(payload.policyId ?? ""); const [policy] = await db.select().from(approvalPolicies).where(and(eq(approvalPolicies.id, policyId), eq(approvalPolicies.organizationId, organization.id))).limit(1);
      if (!policy) return Response.json({ error: "Approval policy not found." }, { status: 404 });
      await db.update(approvalPolicies).set({ active: !policy.active }).where(eq(approvalPolicies.id, policyId));
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "approval_policy.updated", entityType: "approval_policy", entityId: policyId, metadata: JSON.stringify({ active: !policy.active }), createdAt });
    } else if (payload.action === "createTeamCelebration") {
      const title = String(payload.title ?? "").trim(); const eventType = String(payload.eventType ?? "Team Achievement").trim(); const eventDate = String(payload.eventDate ?? "");
      const rewardMode = String(payload.rewardMode ?? "team_experience") as "individual" | "team_experience"; const budgetCents = Number(payload.budgetCents ?? 0);
      const participantIds = [...new Set(Array.isArray(payload.participantIds) ? payload.participantIds.map(String) : [])];
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return Response.json({ error: "Add a title and celebration date." }, { status: 400 });
      if (!(["individual", "team_experience"] as string[]).includes(rewardMode) || budgetCents < 0 || budgetCents > 250000) return Response.json({ error: "Choose a valid reward type and budget up to $2,500." }, { status: 400 });
      const organizationEmployees = await db.select().from(employees).where(eq(employees.organizationId, organization.id));
      const validParticipantIds = participantIds.filter((id) => organizationEmployees.some((employee) => employee.id === id));
      if (validParticipantIds.length < 2 || validParticipantIds.length !== participantIds.length) return Response.json({ error: "Choose at least two employees from your organization." }, { status: 400 });
      const policies = await db.select().from(approvalPolicies).where(and(eq(approvalPolicies.organizationId, organization.id), eq(approvalPolicies.active, true)));
      const rewardType = rewardMode === "team_experience" ? "local" : "digital";
      const matches = policies.filter((policy) => (policy.rewardType === rewardType || policy.rewardType === "any") && budgetCents >= policy.minimumCents && (policy.maximumCents === null || budgetCents <= policy.maximumCents));
      const policy = matches.find((item) => item.rewardType === rewardType) ?? matches.sort((a, b) => b.minimumCents - a.minimumCents)[0];
      const approvalLevel = policy?.approvalLevel ?? "admin"; const id = crypto.randomUUID();
      await db.insert(teamCelebrations).values({ id, organizationId: organization.id, title, eventType, eventDate, department: String(payload.department ?? "").trim() || null, rewardMode, budgetCents, status: approvalLevel === "automatic" ? "approved" : "approval_required", createdAt });
      await db.insert(teamCelebrationParticipants).values(validParticipantIds.map((employeeId) => ({ id: crypto.randomUUID(), organizationId: organization.id, teamCelebrationId: id, employeeId })));
      if (approvalLevel !== "automatic") await db.insert(approvalRequests).values({ id: crypto.randomUUID(), organizationId: organization.id, entityType: "team_celebration", entityId: id, approvalLevel, amountCents: budgetCents, status: "pending", createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "team_celebration.created", entityType: "team_celebration", entityId: id, metadata: JSON.stringify({ participants: validParticipantIds.length, approvalLevel }), createdAt });
    } else if (payload.action === "createConcierge") {
      const employeeId = String(payload.employeeId ?? ""); const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1);
      if (!employee) return Response.json({ error: "Employee not found." }, { status: 404 });
      const id = crypto.randomUUID(); const budgetCents = Number(payload.budgetCents ?? 0);
      if (budgetCents < 2500 || budgetCents > 250000) return Response.json({ error: "Choose a concierge budget between $25 and $2,500." }, { status: 400 });
      await db.insert(conciergeRequests).values({ id, organizationId: organization.id, employeeId, occasion: String(payload.occasion ?? "Custom Celebration"), budgetCents, deliveryDate: String(payload.deliveryDate ?? daysFromNow(7)), status: "submitted", recommendation: null, serviceFeeCents: 4900, createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "concierge.submitted", entityType: "concierge_request", entityId: id, createdAt });
    } else if (payload.action === "toggleRule") {
      const ruleId = String(payload.ruleId ?? ""); const [rule] = await db.select().from(automationRules).where(and(eq(automationRules.id, ruleId), eq(automationRules.organizationId, organization.id))).limit(1);
      if (!rule) return Response.json({ error: "Rule not found." }, { status: 404 });
      await db.update(automationRules).set({ active: !rule.active }).where(eq(automationRules.id, ruleId));
    } else if (payload.action === "createOrder") {
      const employeeId = String(payload.employeeId ?? ""); const productId = String(payload.productId ?? "");
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1); const [product] = await db.select().from(vendorProducts).where(eq(vendorProducts.id, productId)).limit(1);
      if (!employee || !product) return Response.json({ error: "Employee or product not found." }, { status: 404 });
      const [[listing], [availability], [assignment], [profile]] = await Promise.all([
        db.select().from(marketplaceListings).where(and(eq(marketplaceListings.productId, productId), eq(marketplaceListings.active, true))).limit(1),
        db.select().from(vendorAvailability).where(eq(vendorAvailability.vendorName, product.vendorName)).limit(1),
        db.select().from(employeeLocations).where(and(eq(employeeLocations.employeeId, employeeId), eq(employeeLocations.organizationId, organization.id))).limit(1),
        db.select().from(celebrationProfiles).where(and(eq(celebrationProfiles.employeeId, employeeId), eq(celebrationProfiles.organizationId, organization.id))).limit(1),
      ]);
      if (!listing || !availability) return Response.json({ error: "This product is not currently available in an active PerkJoy market." }, { status: 409 });
      const [location] = assignment ? await db.select().from(organizationLocations).where(and(eq(organizationLocations.id, assignment.organizationLocationId), eq(organizationLocations.organizationId, organization.id))).limit(1) : [undefined];
      if (!location?.marketId || location.marketId !== listing.marketId || profile?.preferredDelivery === "digital_only") return Response.json({ error: "This employee's celebration location is outside the vendor's delivery market." }, { status: 409 });
      const deliveryDate = String(payload.deliveryDate ?? "");
      const delivery = new Date(`${deliveryDate}T12:00:00`); const availableDays = JSON.parse(availability.availableDays) as number[]; const blackoutDates = JSON.parse(availability.blackoutDates) as string[];
      if (!Number.isFinite(delivery.getTime()) || delivery.getTime() < Date.now() + availability.minimumNoticeHours * 60 * 60 * 1000) return Response.json({ error: `This vendor needs at least ${availability.minimumNoticeHours} hours' notice. Choose a later date.` }, { status: 400 });
      if (!availableDays.includes(delivery.getDay()) || blackoutDates.includes(deliveryDate)) return Response.json({ error: "This vendor is unavailable on that date. Choose another delivery day." }, { status: 409 });
      const id = crypto.randomUUID();
      await db.insert(localOrders).values({ id, organizationId: organization.id, employeeId, productId, deliveryDate, totalCents: product.priceCents + product.deliveryFeeCents, status: "awaiting_confirmation", createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "local_order.created", entityType: "local_order", entityId: id, metadata: JSON.stringify({ fulfillmentMethod: availability.fulfillmentMethod, marketId: listing.marketId, organizationLocationId: location.id }), createdAt });
    } else if (payload.action === "saveBudget") {
      const monthlyBudgetCents = Number(payload.monthlyBudgetCents ?? 0);
      if (monthlyBudgetCents < 0 || monthlyBudgetCents > 100000000) return Response.json({ error: "Enter a valid monthly budget." }, { status: 400 });
      await db.update(organizations).set({ monthlyBudgetCents }).where(eq(organizations.id, organization.id));
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    return Response.json({ ...await workspace(organization.id), profileInviteUrl });
  } catch (error) {
    console.error("workspace_mutation_failed", error);
    const message = error instanceof Error && error.message.includes("UNIQUE") ? "That record already exists." : "We couldn't save that change. Nothing was charged.";
    return Response.json({ error: message }, { status: 500 });
  }
}
