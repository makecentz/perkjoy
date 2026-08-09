import { and, desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import {
  auditLogs,
  automationRules,
  employees,
  localOrders,
  organizations,
  rewards,
  vendorProducts,
} from "@/db/schema";

function identity(request: Request) {
  const id = request.headers.get("oai-authenticated-user-id");
  const host = new URL(request.url).hostname;
  if (id) return id;
  if (host === "localhost" || host === "127.0.0.1") return "local-demo-user";
  return null;
}

function now() {
  return new Date().toISOString();
}

async function ensureWorkspace(ownerId: string) {
  await ensureDb();
  const db = getDb();
  let [organization] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId)).limit(1);
  if (organization) return organization;

  const organizationId = crypto.randomUUID();
  const createdAt = now();
  [organization] = await db.insert(organizations).values({
    id: organizationId,
    ownerId,
    name: "Philly Creative Co.",
    timezone: "America/New_York",
    monthlyBudgetCents: 50000,
    createdAt,
  }).returning();

  const demoEmployees = [
    ["Sarah", "Johnson", "sarah@phillycreative.demo", "Design", "Senior Designer", 8, 9, "2022-04-18"],
    ["Marcus", "Brown", "marcus@phillycreative.demo", "Engineering", "Product Engineer", 11, 4, "2023-08-14"],
    ["Angela", "White", "angela@phillycreative.demo", "Marketing", "Growth Lead", 8, 18, "2021-02-08"],
    ["David", "Thompson", "david@phillycreative.demo", "Operations", "Studio Manager", 9, 2, "2019-10-21"],
    ["Nicole", "Carter", "nicole@phillycreative.demo", "Client Success", "Account Director", 7, 21, "2025-06-30"],
  ] as const;

  const employeeRows = demoEmployees.map(([firstName, lastName, email, department, jobTitle, birthdayMonth, birthdayDay, hireDate]) => ({
    id: crypto.randomUUID(), organizationId, firstName, lastName, email, department, jobTitle,
    birthdayMonth, birthdayDay, hireDate, status: "active" as const, createdAt,
  }));

  await db.insert(employees).values(employeeRows);

  const rules = [
    { id: crypto.randomUUID(), organizationId, name: "Birthday surprise", eventType: "Birthday", rewardType: "Employee Choice", amountCents: 5000, timing: "On the birthday", active: true, approvalRequired: false, createdAt },
    { id: crypto.randomUUID(), organizationId, name: "Work anniversary", eventType: "Anniversary", rewardType: "Digital Reward", amountCents: 7500, timing: "On the anniversary", active: true, approvalRequired: true, createdAt },
    { id: crypto.randomUUID(), organizationId, name: "New hire welcome", eventType: "Welcome", rewardType: "Digital Reward", amountCents: 2500, timing: "After 7 days", active: false, approvalRequired: false, createdAt },
  ];
  await db.insert(automationRules).values(rules);

  await db.insert(rewards).values([
    { id: crypto.randomUUID(), organizationId, employeeId: employeeRows[4].id, eventKey: `demo:${organizationId}:nicole`, recognitionType: "Above & Beyond", message: "Thank you for making the client launch feel effortless.", amountCents: 5000, status: "sent", provider: "tremendous_sandbox", createdAt },
    { id: crypto.randomUUID(), organizationId, employeeId: employeeRows[0].id, eventKey: `demo:${organizationId}:sarah`, recognitionType: "Project Completed", message: "Beautiful work on the summer campaign.", amountCents: 2500, status: "delivered", provider: "tremendous_sandbox", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  ]);

  const existingProducts = await db.select().from(vendorProducts).limit(1);
  if (existingProducts.length === 0) {
    await db.insert(vendorProducts).values([
      { id: "demo-cake", vendorName: "Demo Philadelphia Bakery", name: "Sunshine Celebration Cake", description: "A bright 6-inch vanilla or chocolate cake finished with joyful buttercream.", category: "Birthday Cakes", priceCents: 4900, deliveryFeeCents: 1200, servesPeople: 10, demo: true },
      { id: "demo-cupcakes", vendorName: "Demo Philadelphia Bakery", name: "Confetti Cupcake Dozen", description: "Twelve celebration cupcakes with a handwritten gift note.", category: "Cupcakes", priceCents: 3800, deliveryFeeCents: 1200, servesPeople: 12, demo: true },
      { id: "demo-box", vendorName: "Demo Philadelphia Confectioner", name: "Team Treat Box", description: "Cookies, brownies, and locally made sweets packed for sharing.", category: "Treat Boxes", priceCents: 5600, deliveryFeeCents: 900, servesPeople: 8, demo: true },
    ]);
  }

  return organization;
}

async function workspace(organizationId: string) {
  const db = getDb();
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const [employeeRows, ruleRows, rewardRows, productRows, orderRows] = await Promise.all([
    db.select().from(employees).where(eq(employees.organizationId, organizationId)).orderBy(employees.firstName),
    db.select().from(automationRules).where(eq(automationRules.organizationId, organizationId)).orderBy(automationRules.createdAt),
    db.select().from(rewards).where(eq(rewards.organizationId, organizationId)).orderBy(desc(rewards.createdAt)),
    db.select().from(vendorProducts),
    db.select().from(localOrders).where(eq(localOrders.organizationId, organizationId)).orderBy(desc(localOrders.createdAt)),
  ]);
  return { organization, employees: employeeRows, rules: ruleRows, rewards: rewardRows, products: productRows, localOrders: orderRows };
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

    if (payload.action === "addEmployee") {
      const firstName = String(payload.firstName ?? "").trim();
      const lastName = String(payload.lastName ?? "").trim();
      const email = String(payload.email ?? "").trim().toLowerCase();
      if (!firstName || !lastName || !email.includes("@")) return Response.json({ error: "Add a name and valid work email." }, { status: 400 });
      const id = crypto.randomUUID();
      await db.insert(employees).values({
        id, organizationId: organization.id, firstName, lastName, email,
        department: String(payload.department ?? "General"), jobTitle: String(payload.jobTitle ?? "Team Member"),
        birthdayMonth: Number(payload.birthdayMonth ?? 1), birthdayDay: Number(payload.birthdayDay ?? 1),
        hireDate: String(payload.hireDate ?? new Date().toISOString().slice(0, 10)), status: "active", createdAt,
      });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "employee.created", entityType: "employee", entityId: id, createdAt });
    } else if (payload.action === "recognize") {
      const employeeId = String(payload.employeeId ?? "");
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1);
      if (!employee) return Response.json({ error: "Employee not found." }, { status: 404 });
      const amountCents = Number(payload.amountCents ?? 0);
      if (amountCents < 0 || amountCents > 100000) return Response.json({ error: "Reward amount is outside your policy." }, { status: 400 });
      const id = crypto.randomUUID();
      await db.insert(rewards).values({
        id, organizationId: organization.id, employeeId,
        eventKey: `manual:${organization.id}:${id}`, recognitionType: String(payload.recognitionType ?? "Great Work"),
        message: String(payload.message ?? "Great work deserves recognition."), amountCents,
        status: amountCents > 0 ? "scheduled" : "sent", provider: amountCents > 0 ? "tremendous_sandbox" : "recognition_only", createdAt,
      });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "reward.scheduled", entityType: "reward", entityId: id, metadata: JSON.stringify({ amountCents, liveMode: false }), createdAt });
    } else if (payload.action === "toggleRule") {
      const ruleId = String(payload.ruleId ?? "");
      const [rule] = await db.select().from(automationRules).where(and(eq(automationRules.id, ruleId), eq(automationRules.organizationId, organization.id))).limit(1);
      if (!rule) return Response.json({ error: "Rule not found." }, { status: 404 });
      await db.update(automationRules).set({ active: !rule.active }).where(and(eq(automationRules.id, ruleId), eq(automationRules.organizationId, organization.id)));
    } else if (payload.action === "createOrder") {
      const employeeId = String(payload.employeeId ?? "");
      const productId = String(payload.productId ?? "");
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, organization.id))).limit(1);
      const [product] = await db.select().from(vendorProducts).where(eq(vendorProducts.id, productId)).limit(1);
      if (!employee || !product) return Response.json({ error: "Employee or product not found." }, { status: 404 });
      const id = crypto.randomUUID();
      await db.insert(localOrders).values({ id, organizationId: organization.id, employeeId, productId, deliveryDate: String(payload.deliveryDate), totalCents: product.priceCents + product.deliveryFeeCents, status: "paid", createdAt });
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), organizationId: organization.id, actorId: ownerId, action: "local_order.created", entityType: "local_order", entityId: id, createdAt });
    } else if (payload.action === "saveBudget") {
      const monthlyBudgetCents = Number(payload.monthlyBudgetCents ?? 0);
      if (monthlyBudgetCents < 0 || monthlyBudgetCents > 100000000) return Response.json({ error: "Enter a valid monthly budget." }, { status: 400 });
      await db.update(organizations).set({ monthlyBudgetCents }).where(eq(organizations.id, organization.id));
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    return Response.json(await workspace(organization.id));
  } catch (error) {
    console.error("workspace_mutation_failed", error);
    const message = error instanceof Error && error.message.includes("UNIQUE") ? "That record already exists." : "We couldn't save that change. Nothing was charged.";
    return Response.json({ error: message }, { status: 500 });
  }
}
