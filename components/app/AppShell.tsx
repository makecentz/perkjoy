"use client";
/* eslint-disable react-hooks/purity, jsx-a11y/no-autofocus, jsx-a11y/anchor-is-valid */

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award, BarChart3, Bell, Building2, CakeSlice, CalendarDays, Check, ChevronDown,
  CircleDollarSign, CreditCard, Gift, LayoutDashboard, Menu, MoreHorizontal,
  Plus, Search, Settings, ShieldCheck, Sparkles, Store, Users, X, Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isSameMonth } from "date-fns";
import { Logo } from "@/components/brand/Logo";
import { nextAnniversary, nextBirthday } from "@/lib/celebrations";
import type { Employee, Product, Workspace } from "@/lib/types";

type View = "dashboard" | "employees" | "celebrations" | "rewards" | "perkjoy-local" | "rules" | "reports" | "team" | "billing" | "settings";

const nav: { view: View; label: string; icon: typeof LayoutDashboard; href: string }[] = [
  { view: "dashboard", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { view: "employees", label: "Employees", icon: Users, href: "/employees" },
  { view: "celebrations", label: "Celebrations", icon: CalendarDays, href: "/celebrations" },
  { view: "rewards", label: "Rewards", icon: Gift, href: "/rewards" },
  { view: "perkjoy-local", label: "PerkJoy Local", icon: Store, href: "/perkjoy-local" },
  { view: "rules", label: "Automation Rules", icon: Zap, href: "/rules" },
  { view: "reports", label: "Reports", icon: BarChart3, href: "/reports" },
  { view: "team", label: "Team", icon: Building2, href: "/team" },
  { view: "billing", label: "Billing", icon: CreditCard, href: "/billing" },
  { view: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

type Celebration = { employee: Employee; type: "Birthday" | "Anniversary"; date: Date; label: string; amount: number; tone: string };

function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }
function initials(employee: Employee) { return `${employee.firstName[0]}${employee.lastName[0]}`; }
function fullName(employee?: Employee) { return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown employee"; }

export function AppShell({ view = "dashboard" }: { view?: View }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState<"employee" | "recognize" | "order" | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const json = await response.json() as Workspace & { error?: string };
      if (!response.ok) throw new Error(json.error || "Unable to load workspace");
      setData(json); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load workspace"); }
  }

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json() as Workspace & { error?: string };
      if (!response.ok) throw new Error(json.error || "Unable to save change");
      setData(json); setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save change"); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/workspace", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json() as Workspace & { error?: string };
        if (!response.ok) throw new Error(json.error || "Unable to load workspace");
        if (active) { setData(json); setError(""); }
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load workspace"); });
    return () => { active = false; };
  }, []);

  const celebrations = useMemo<Celebration[]>(() => {
    if (!data) return [];
    return data.employees.flatMap((employee, index) => {
      const birthday = nextBirthday(employee);
      const anniversary = nextAnniversary(employee);
      return [
        { employee, type: "Birthday" as const, date: birthday, label: "Birthday", amount: 5000, tone: ["coral", "purple", "green"][index % 3] },
        { employee, type: "Anniversary" as const, date: anniversary.date, label: `${anniversary.years} Year Anniversary`, amount: 7500, tone: "gold" },
      ];
    }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
  }, [data]);

  if (!data && !error) return <AppSkeleton />;

  return (
    <div className="app-page">
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-head"><Link href="/"><Logo /></Link><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button></div>
        <nav className="app-nav">
          <small>WORKSPACE</small>
          {nav.slice(0, 7).map((item) => <Link className={item.view === view ? "active" : ""} href={item.href} key={item.view} onClick={() => setMobileOpen(false)}><item.icon />{item.label}{item.view === "celebrations" && <em>8</em>}</Link>)}
          <small>MANAGE</small>
          {nav.slice(7).map((item) => <Link className={item.view === view ? "active" : ""} href={item.href} key={item.view} onClick={() => setMobileOpen(false)}><item.icon />{item.label}</Link>)}
        </nav>
        <div className="sidebar-card"><span><Sparkles /></span><b>Celebration streak</b><p>12 moments remembered this quarter.</p><div><i style={{ width: "78%" }} /></div></div>
        <div className="sidebar-user"><span>TM</span><div><b>Taylor Morgan</b><small>Owner · Philly Creative</small></div><MoreHorizontal /></div>
      </aside>

      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <section className="app-workspace">
        <header className="app-topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button><div className="company-switcher"><span>PC</span><b>{data?.organization.name}</b><ChevronDown /></div><div className="topbar-actions"><button aria-label="Search"><Search /></button><button className="notification-button" aria-label="Notifications"><Bell /><i /></button><button className="button button-primary recognize-top" onClick={() => { setSelectedEmployee(data?.employees[0]?.id ?? ""); setModal("recognize"); }}><Plus /> Recognize someone</button></div></header>
        <main className="app-content">
          {error && <div className="app-error"><span>{error}</span><button onClick={load}>Try again</button></div>}
          {data && <ViewContent view={view} data={data} celebrations={celebrations} mutate={mutate} openEmployee={() => setModal("employee")} openRecognize={(id) => { setSelectedEmployee(id ?? data.employees[0]?.id ?? ""); setModal("recognize"); }} openOrder={(product) => { setSelectedProduct(product); setSelectedEmployee(data.employees[0]?.id ?? ""); setModal("order"); }} />}
        </main>
      </section>

      {modal === "employee" && <AddEmployeeModal busy={busy} close={() => setModal(null)} submit={mutate} />}
      {modal === "recognize" && data && <RecognitionModal employees={data.employees} selected={selectedEmployee} setSelected={setSelectedEmployee} busy={busy} close={() => setModal(null)} submit={mutate} />}
      {modal === "order" && data && selectedProduct && <OrderModal employees={data.employees} product={selectedProduct} selected={selectedEmployee} setSelected={setSelectedEmployee} busy={busy} close={() => setModal(null)} submit={mutate} />}
    </div>
  );
}

function ViewContent({ view, data, celebrations, mutate, openEmployee, openRecognize, openOrder }: { view: View; data: Workspace; celebrations: Celebration[]; mutate: (payload: Record<string, unknown>) => void; openEmployee: () => void; openRecognize: (id?: string) => void; openOrder: (product: Product) => void }) {
  if (view === "dashboard") return <Dashboard data={data} celebrations={celebrations} openRecognize={openRecognize} />;
  if (view === "employees") return <EmployeesView data={data} celebrations={celebrations} openEmployee={openEmployee} openRecognize={openRecognize} />;
  if (view === "celebrations") return <CelebrationsView celebrations={celebrations} />;
  if (view === "rewards") return <RewardsView data={data} openRecognize={openRecognize} />;
  if (view === "perkjoy-local") return <LocalView data={data} openOrder={openOrder} />;
  if (view === "rules") return <RulesView data={data} mutate={mutate} />;
  if (view === "reports") return <ReportsView data={data} />;
  if (view === "team") return <TeamView />;
  if (view === "billing") return <BillingView />;
  return <SettingsView data={data} mutate={mutate} />;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="app-page-head"><div>{eyebrow && <small>{eyebrow}</small>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Dashboard({ data, celebrations, openRecognize }: { data: Workspace; celebrations: Celebration[]; openRecognize: (id?: string) => void }) {
  const [today] = useState(() => new Date());
  const monthRewards = data.rewards.filter((reward) => isSameMonth(new Date(reward.createdAt), new Date()));
  const spend = monthRewards.reduce((sum, reward) => sum + reward.amountCents, 0) + data.localOrders.reduce((sum, order) => sum + order.totalCents, 0);
  return <>
    <PageHeader title="Good morning, Taylor 👋" description="Here's what's happening with your team." action={<div className="header-date"><CalendarDays /><span><small>Today</small><b>{format(today, "EEEE, MMMM d")}</b></span></div>} />
    <div className="kpi-grid">
      <Kpi icon={CalendarDays} tone="coral" label="Upcoming celebrations" value={String(celebrations.filter((c) => (c.date.getTime() - today.getTime()) / 86400000 < 30).length)} note="Next 30 days" trend="2 this week" />
      <Kpi icon={Gift} tone="purple" label="Rewards sent" value={String(monthRewards.length)} note="This month" trend="↑ 18%" />
      <Kpi icon={CircleDollarSign} tone="gold" label="Recognition spend" value={money(spend)} note="This month" trend={`${money(data.organization.monthlyBudgetCents - spend)} left`} />
      <Kpi icon={Users} tone="green" label="Employees" value={String(data.employees.length)} note="Total active" trend="All synced" />
    </div>
    <div className="dashboard-grid">
      <section className="app-card upcoming-card"><div className="card-head"><div><h2>Upcoming celebrations</h2><p>Your next moments worth celebrating.</p></div><Link href="/celebrations">View calendar <span>→</span></Link></div><div className="celebration-list">{celebrations.slice(0, 4).map((event, index) => <div className="celebration-row" key={`${event.employee.id}-${event.type}`}><div className={`date-block ${event.tone}`}><small>{format(event.date, "MMM").toUpperCase()}</small><b>{format(event.date, "dd")}</b></div><span className={`avatar avatar-${event.tone === "gold" ? "gold" : event.tone === "green" ? "green" : "coral"}`}>{initials(event.employee)}</span><div className="event-name"><b>{fullName(event.employee)}</b><span><i className={`event-dot ${event.tone}`} />{event.label} · {formatDistanceToNow(event.date, { addSuffix: true })}</span></div><div className="event-reward"><span>{index === 2 ? "No reward selected" : index === 1 ? "Cake scheduled" : `${money(event.amount)} reward scheduled`}</span><button onClick={() => openRecognize(event.employee.id)}>{index === 2 ? "Choose reward" : "Edit reward"}</button></div><button className="icon-button"><MoreHorizontal /></button></div>)}</div><div className="card-foot"><Sparkles /> PerkJoy is watching <b>{celebrations.length} upcoming moments</b> for your team.</div></section>
      <aside className="dashboard-side"><BudgetCard data={data} spend={spend} /><ActivityCard data={data} /></aside>
    </div>
  </>;
}

function Kpi({ icon: Icon, tone, label, value, note, trend }: { icon: typeof Gift; tone: string; label: string; value: string; note: string; trend: string }) { return <article className="kpi-card"><span className={`kpi-icon ${tone}`}><Icon /></span><div><small>{label}</small><b>{value}</b><p>{note}</p></div><em>{trend}</em></article>; }

function BudgetCard({ data, spend }: { data: Workspace; spend: number }) { const pct = Math.min(100, Math.round(spend / data.organization.monthlyBudgetCents * 100)); return <section className="app-card budget-card"><div className="card-head"><div><h2>Monthly budget</h2><p>August recognition spend</p></div><button><MoreHorizontal /></button></div><div className="budget-ring" style={{ "--progress": `${pct * 3.6}deg` } as React.CSSProperties}><div><small>Remaining</small><b>{money(Math.max(0, data.organization.monthlyBudgetCents - spend))}</b></div></div><div className="budget-detail"><span><i className="committed" />Committed<b>{money(spend)}</b></span><span><i className="remaining" />Budget<b>{money(data.organization.monthlyBudgetCents)}</b></span></div><Link href="/settings">Manage budget <span>→</span></Link></section>; }

function ActivityCard({ data }: { data: Workspace }) { const latest = data.rewards.slice(0, 3); return <section className="app-card activity-card"><div className="card-head"><div><h2>Recent activity</h2><p>Recognition across your team</p></div></div><div>{latest.map((reward) => { const employee = data.employees.find((item) => item.id === reward.employeeId); return <span key={reward.id}><i className="activity-icon"><Award /></i><p><b>{fullName(employee)}</b> was recognized for {reward.recognitionType}<small>{formatDistanceToNow(new Date(reward.createdAt), { addSuffix: true })}</small></p><em>{money(reward.amountCents)}</em></span>; })}</div><Link href="/rewards">View all activity →</Link></section>; }

function EmployeesView({ data, celebrations, openEmployee, openRecognize }: { data: Workspace; celebrations: Celebration[]; openEmployee: () => void; openRecognize: (id?: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = data.employees.filter((e) => fullName(e).toLowerCase().includes(query.toLowerCase()) || e.department.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader eyebrow="PEOPLE" title="Employees" description="Manage your team and every moment worth celebrating." action={<div className="head-actions"><button className="button button-secondary">Import CSV</button><button className="button button-primary" onClick={openEmployee}><Plus /> Add employee</button></div>} /><div className="toolbar"><label><Search /><input placeholder="Search employees" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Department"><option>All departments</option><option>Design</option><option>Engineering</option></select><select aria-label="Status"><option>Active employees</option></select><span>{filtered.length} people</span></div><section className="app-card data-table"><div className="table-row table-head"><span>Employee</span><span>Department</span><span>Birthday</span><span>Hire date</span><span>Next celebration</span><span>Status</span><span /></div>{filtered.map((employee) => { const next = celebrations.find((c) => c.employee.id === employee.id); return <div className="table-row" key={employee.id}><span className="employee-cell"><i className="avatar avatar-coral">{initials(employee)}</i><p><b>{fullName(employee)}</b><small>{employee.email}</small></p></span><span><b>{employee.department}</b><small>{employee.jobTitle}</small></span><span>{format(new Date(2020, employee.birthdayMonth - 1, employee.birthdayDay), "MMM d")}</span><span>{format(new Date(`${employee.hireDate}T12:00:00`), "MMM d, yyyy")}</span><span><b>{next?.label}</b><small>{next ? format(next.date, "MMM d") : "—"}</small></span><span><em className="status-badge active"><i /> Active</em></span><span><button className="icon-button" onClick={() => openRecognize(employee.id)}><Award /></button></span></div>; })}</section></>;
}

function CelebrationsView({ celebrations }: { celebrations: Celebration[] }) { return <><PageHeader eyebrow="CALENDAR" title="Celebrations" description="Every birthday, anniversary, and recognition—at a glance." action={<div className="segmented"><button className="active">Upcoming</button><button>Month</button></div>} /><div className="calendar-summary"><span><CakeSlice /> <b>{celebrations.filter((c) => c.type === "Birthday").length}</b> birthdays</span><span><Award /> <b>{celebrations.filter((c) => c.type === "Anniversary").length}</b> anniversaries</span><span><Gift /> <b>{celebrations.length}</b> scheduled moments</span></div><section className="app-card timeline-card">{celebrations.map((event, index) => <div className="timeline-row" key={`${event.employee.id}-${event.type}`}><span className="timeline-line">{index !== celebrations.length - 1 && <i />}</span><div className={`date-block ${event.tone}`}><small>{format(event.date, "MMM")}</small><b>{format(event.date, "dd")}</b></div><span className="avatar avatar-green">{initials(event.employee)}</span><div><b>{fullName(event.employee)}</b><p>{event.label} · {event.employee.department}</p></div><em>{formatDistanceToNow(event.date, { addSuffix: true })}</em><span className={`status-badge ${index % 3 === 2 ? "warning" : "active"}`}>{index % 3 === 2 ? "Needs reward" : "Scheduled"}</span></div>)}</section></>; }

function RewardsView({ data, openRecognize }: { data: Workspace; openRecognize: (id?: string) => void }) { return <><PageHeader eyebrow="RECOGNITION" title="Rewards" description="Track every thank-you, celebration, and delivery." action={<button className="button button-primary" onClick={() => openRecognize()}><Plus /> Send recognition</button>} /><div className="reward-stats"><article><Gift /><div><small>Total sent</small><b>{data.rewards.length}</b></div></article><article><CircleDollarSign /><div><small>Reward volume</small><b>{money(data.rewards.reduce((s, r) => s + r.amountCents, 0))}</b></div></article><article><Check /><div><small>Delivery rate</small><b>100%</b></div></article></div><section className="app-card data-table rewards-table"><div className="table-row table-head"><span>Recipient</span><span>Recognition</span><span>Reward</span><span>Provider</span><span>Date</span><span>Status</span></div>{data.rewards.map((reward) => { const employee = data.employees.find((e) => e.id === reward.employeeId); return <div className="table-row" key={reward.id}><span className="employee-cell"><i className="avatar avatar-coral">{employee ? initials(employee) : "?"}</i><p><b>{fullName(employee)}</b><small>{employee?.email}</small></p></span><span><b>{reward.recognitionType}</b><small>{reward.message}</small></span><span><b>{money(reward.amountCents)}</b></span><span>{reward.provider.replace("_", " ")}</span><span>{format(new Date(reward.createdAt), "MMM d, yyyy")}</span><span><em className="status-badge active"><i /> {reward.status}</em></span></div>; })}</section><div className="sandbox-note"><ShieldCheck /> <div><b>Safe development mode is on</b><p>Digital rewards use Tremendous Sandbox and are clearly marked as TEST. Production endpoints are blocked.</p></div></div></>; }

function LocalView({ data, openOrder }: { data: Workspace; openOrder: (product: Product) => void }) { return <><div className="local-app-hero"><div><span><MapPinSmall /> Philadelphia</span><h1>Send something<br />made around the corner.</h1><p>Local cakes and treats delivered to your team, with fulfillment coordinated by PerkJoy.</p></div><div className="local-app-art"><CakeSlice /><span>Made in Philly</span></div></div><div className="local-categories"><button className="active">All gifts</button><button>Birthday cakes</button><button>Cupcakes</button><button>Cookies</button><button>Treat boxes</button></div><div className="catalog-grid">{data.products.map((product, index) => <article key={product.id}><div className={`catalog-art art-${index + 1}`}><span>{index === 0 ? "🎂" : index === 1 ? "🧁" : "🍪"}</span><em>Demo vendor</em></div><div><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><span><b>{money(product.priceCents)}</b><small> + {money(product.deliveryFeeCents)} delivery</small></span><button className="button button-primary" onClick={() => openOrder(product)}>Send this gift</button></div></article>)}</div>{data.localOrders.length > 0 && <section className="app-card order-status"><div className="card-head"><div><h2>Local gift orders</h2><p>Fulfilled by the PerkJoy operations team.</p></div></div>{data.localOrders.map((order) => <div key={order.id}><span className="activity-icon"><CakeSlice /></span><p><b>{data.products.find((p) => p.id === order.productId)?.name}</b><small>For {fullName(data.employees.find((e) => e.id === order.employeeId))} · Delivery {format(new Date(`${order.deliveryDate}T12:00:00`), "MMM d")}</small></p><em className="status-badge active">{order.status}</em><b>{money(order.totalCents)}</b></div>)}</section>}</>; }

function MapPinSmall() { return <Store size={15} />; }

function RulesView({ data, mutate }: { data: Workspace; mutate: (payload: Record<string, unknown>) => void }) { return <><PageHeader eyebrow="AUTOMATION" title="Celebration rules" description="Set it once. PerkJoy keeps every moment on track." action={<button className="button button-primary"><Plus /> Create rule</button>} /><div className="mode-banner"><div><span><Zap /></span><div><small>APPROVAL MODE</small><b>Automatic with safeguards</b><p>Eligible rewards send automatically. Anniversary rewards over $50 require approval.</p></div></div><button>Manage mode</button></div><section className="rules-grid">{data.rules.map((rule) => <article className="app-card rule-card" key={rule.id}><div><span className={`rule-icon ${rule.active ? "active" : "paused"}`}>{rule.eventType === "Birthday" ? <CakeSlice /> : rule.eventType === "Anniversary" ? <Award /> : <Sparkles />}</span><button className="icon-button"><MoreHorizontal /></button></div><small>{rule.eventType.toUpperCase()}</small><h3>{rule.name}</h3><div className="rule-flow"><span>{rule.eventType}</span><i>→</i><span>{rule.rewardType} · {money(rule.amountCents)}</span></div><p><CalendarDays /> {rule.timing}</p><footer><span className={`status-badge ${rule.active ? "active" : "paused"}`}><i /> {rule.active ? "Active" : "Paused"}</span><button className={`switch ${rule.active ? "on" : ""}`} onClick={() => mutate({ action: "toggleRule", ruleId: rule.id })} aria-label={`Toggle ${rule.name}`}><i /></button></footer></article>)}</section><div className="empty-add-card"><span><Plus /></span><div><b>Build another celebration rule</b><p>Automate promotions, new-hire welcomes, custom milestones, and more.</p></div><button className="button button-secondary">Create rule</button></div></>; }

function ReportsView({ data }: { data: Workspace }) { const total = data.rewards.reduce((s, r) => s + r.amountCents, 0) + data.localOrders.reduce((s, o) => s + o.totalCents, 0); return <><PageHeader eyebrow="INSIGHTS" title="Recognition reports" description="See the impact of appreciation across your company." action={<select className="date-select"><option>This month</option><option>Last 90 days</option></select>} /><div className="report-kpis"><article><small>Employees recognized</small><b>{new Set(data.rewards.map((r) => r.employeeId)).size}</b><em>of {data.employees.length} employees</em></article><article><small>Total recognition spend</small><b>{money(total)}</b><em>Digital + local gifts</em></article><article><small>Avg. reward value</small><b>{money(data.rewards.length ? total / data.rewards.length : 0)}</b><em>Across all moments</em></article></div><section className="app-card report-chart"><div className="card-head"><div><h2>Recognition activity</h2><p>Spend by recognition type</p></div></div><div className="bar-chart">{[["Birthdays",68,"#f27a5f"],["Anniversaries",46,"#e6b94d"],["Manual recognition",82,"#548c78"],["Local gifts",35,"#8166aa"]].map(([label, value, color]) => <span key={String(label)}><small>{label}</small><i><b style={{ width: `${value}%`, background: String(color) }} /></i><em>{value}%</em></span>)}</div></section></>; }

function TeamView() { return <><PageHeader eyebrow="ACCESS" title="Your PerkJoy team" description="Invite teammates and control what they can see and do." action={<button className="button button-primary"><Plus /> Invite teammate</button>} /><section className="app-card data-table team-table"><div className="table-row table-head"><span>Team member</span><span>Role</span><span>Access</span><span>Status</span><span /></div>{[["Taylor Morgan","taylor@phillycreative.demo","Owner","Full organization"],["Jordan Lee","jordan@phillycreative.demo","Manager","Design team"],["Priya Shah","priya@phillycreative.demo","Viewer","Reports only"]].map(([name,email,role,access], index) => <div className="table-row" key={email}><span className="employee-cell"><i className={`avatar ${index === 1 ? "avatar-green" : "avatar-coral"}`}>{name.split(" ").map((p) => p[0]).join("")}</i><p><b>{name}</b><small>{email}</small></p></span><span><b>{role}</b></span><span>{access}</span><span><em className="status-badge active"><i /> Active</em></span><span><button className="icon-button"><MoreHorizontal /></button></span></div>)}</section></>; }

function BillingView() { return <><PageHeader eyebrow="PLAN & BILLING" title="Billing" description="Manage your PerkJoy subscription and payment details." /><div className="billing-grid"><section className="app-card plan-card"><span>GROWTH PLAN</span><h2>$79<small>/month</small></h2><p>For teams with up to 100 employees.</p><div><Check /> Automated celebrations</div><div><Check /> PerkJoy Local access</div><div><Check /> Reports and budget controls</div><button className="button button-primary">Manage subscription</button></section><section className="app-card payment-card"><div className="card-head"><div><h2>Payment method</h2><p>Used for your SaaS subscription only.</p></div></div><div className="credit-card-row"><span><CreditCard /></span><p><b>Visa ending in 4242</b><small>Expires 08/29</small></p><button>Edit</button></div><div className="billing-note"><ShieldCheck /> Reward purchases and your PerkJoy subscription are billed separately.</div></section></div></>; }

function SettingsView({ data, mutate }: { data: Workspace; mutate: (payload: Record<string, unknown>) => void }) { const [budget, setBudget] = useState(String(data.organization.monthlyBudgetCents / 100)); return <><PageHeader eyebrow="ORGANIZATION" title="Settings" description="Configure how PerkJoy works for your company." /><div className="settings-layout"><aside><a className="active">Company profile</a><a>Recognition settings</a><a>Notifications</a><a>Security</a></aside><section className="app-card settings-card"><div><h2>Company profile</h2><p>Your company details and recognition preferences.</p></div><label>Company name<input defaultValue={data.organization.name} /></label><div className="form-grid"><label>Timezone<select defaultValue={data.organization.timezone}><option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option></select></label><label>Approval mode<select defaultValue="automatic"><option value="automatic">Automatic with safeguards</option><option>Approval required</option><option>Reminder only</option></select></label></div><div className="form-grid"><label>Monthly recognition budget<div className="money-input"><span>$</span><input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} /></div></label><label>Leap-day birthday handling<select><option>February 28</option><option>March 1</option></select></label></div><div className="settings-actions"><button className="button button-primary" onClick={() => mutate({ action: "saveBudget", monthlyBudgetCents: Number(budget) * 100 })}>Save changes</button></div></section></div></>; }

function ModalShell({ title, description, close, children }: { title: string; description: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2><p>{description}</p></div><button onClick={close} aria-label="Close"><X /></button></header>{children}</section></div>; }

function AddEmployeeModal({ busy, close, submit }: { busy: boolean; close: () => void; submit: (payload: Record<string, unknown>) => void }) { function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); submit({ action: "addEmployee", ...Object.fromEntries(form.entries()), birthdayMonth: Number(form.get("birthdayMonth")), birthdayDay: Number(form.get("birthdayDay")) }); } return <ModalShell title="Add an employee" description="We'll start watching for their important moments." close={close}><form onSubmit={onSubmit}><div className="form-grid"><label>First name<input required name="firstName" autoFocus /></label><label>Last name<input required name="lastName" /></label></div><label>Work email<input required type="email" name="email" /></label><div className="form-grid"><label>Department<input required name="department" placeholder="e.g. Design" /></label><label>Job title<input required name="jobTitle" /></label></div><div className="form-grid three"><label>Birthday month<select name="birthdayMonth" defaultValue="8">{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{format(new Date(2020, i, 1), "MMMM")}</option>)}</select></label><label>Day<input name="birthdayDay" type="number" min="1" max="31" defaultValue="15" /></label><label>Hire date<input required name="hireDate" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} /></label></div><p className="privacy-note"><ShieldCheck /> Birth year is never required. Birthday data stays private to your organization.</p><footer><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Adding…" : "Add employee"}</button></footer></form></ModalShell>; }

function RecognitionModal({ employees, selected, setSelected, busy, close, submit }: { employees: Employee[]; selected: string; setSelected: (id: string) => void; busy: boolean; close: () => void; submit: (payload: Record<string, unknown>) => void }) { const [amount, setAmount] = useState(5000); function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); submit({ action: "recognize", employeeId: selected, recognitionType: form.get("recognitionType"), message: form.get("message"), amountCents: amount }); } return <ModalShell title="Recognize great work" description="A thoughtful thank-you, sent in under a minute." close={close}><form onSubmit={onSubmit}><label>Employee<select value={selected} onChange={(e) => setSelected(e.target.value)}>{employees.map((employee) => <option value={employee.id} key={employee.id}>{fullName(employee)}</option>)}</select></label><label>Recognition type<select name="recognitionType"><option>Great Work</option><option>Above & Beyond</option><option>Customer Praise</option><option>Project Completed</option><option>Team Player</option><option>Promotion</option></select></label><label>Message<textarea name="message" required defaultValue="Your work made a real difference. Thank you for going above and beyond!" rows={4} /></label><fieldset><legend>Reward amount</legend><div className="amount-picker">{[0,1000,2500,5000,7500,10000].map((value) => <button type="button" className={amount === value ? "active" : ""} onClick={() => setAmount(value)} key={value}>{value === 0 ? "Recognition only" : money(value)}</button>)}</div></fieldset><div className="confirmation-strip"><Gift /><span><b>{amount ? `${money(amount)} TEST digital reward` : "Recognition message"}</b><small>{amount ? "Scheduled through Tremendous Sandbox" : "No reward purchase"}</small></span></div><footer><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Scheduling…" : amount ? `Confirm & schedule ${money(amount)}` : "Send recognition"}</button></footer></form></ModalShell>; }

function OrderModal({ employees, product, selected, setSelected, busy, close, submit }: { employees: Employee[]; product: Product; selected: string; setSelected: (id: string) => void; busy: boolean; close: () => void; submit: (payload: Record<string, unknown>) => void }) { const tomorrow = format(new Date(Date.now() + 86400000 * 2), "yyyy-MM-dd"); function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); submit({ action: "createOrder", employeeId: selected, productId: product.id, deliveryDate: form.get("deliveryDate") }); } return <ModalShell title="Send a local gift" description="PerkJoy will confirm the order with the demo vendor." close={close}><form onSubmit={onSubmit}><div className="selected-product"><span>🎂</span><div><small>{product.vendorName}</small><b>{product.name}</b><p>Serves {product.servesPeople}</p></div><b>{money(product.priceCents)}</b></div><label>Employee<select value={selected} onChange={(e) => setSelected(e.target.value)}>{employees.map((employee) => <option value={employee.id} key={employee.id}>{fullName(employee)}</option>)}</select></label><label>Delivery date<input required name="deliveryDate" type="date" min={tomorrow} defaultValue={tomorrow} /></label><label>Gift message<textarea rows={3} defaultValue="Hope your day is as wonderful as you are. Happy Birthday!" /></label><div className="order-total"><span>Product <b>{money(product.priceCents)}</b></span><span>Delivery <b>{money(product.deliveryFeeCents)}</b></span><hr /><span>Total <b>{money(product.priceCents + product.deliveryFeeCents)}</b></span></div><p className="privacy-note"><ShieldCheck /> This demo order enters PerkJoy&apos;s fulfillment queue. It is not sent to a real bakery.</p><footer><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Placing order…" : `Confirm ${money(product.priceCents + product.deliveryFeeCents)}`}</button></footer></form></ModalShell>; }

function AppSkeleton() { return <div className="app-page"><aside className="app-sidebar"><div className="sidebar-head"><Logo /></div></aside><section className="app-workspace"><header className="app-topbar" /><main className="app-content"><div className="skeleton title-skeleton" /><div className="kpi-grid">{Array.from({ length: 4 }, (_, i) => <div className="skeleton kpi-skeleton" key={i} />)}</div><div className="skeleton table-skeleton" /></main></section></div>; }
