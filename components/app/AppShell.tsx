"use client";
/* eslint-disable react-hooks/purity, jsx-a11y/no-autofocus, jsx-a11y/label-has-associated-control */

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Building2,
  CakeSlice,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Gift,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isSameMonth } from "date-fns";
import { Logo } from "@/components/brand/Logo";
import { nextAnniversary, nextBirthday } from "@/lib/celebrations";
import { automationTemplates } from "@/lib/automation-templates";
import type { Employee, Product, Workspace } from "@/lib/types";
import {
  AutomationOperations,
  NotificationCenter,
} from "@/components/app/PhaseHControls";
import { authenticatedFetch } from "@/lib/supabase/fetch";
import { EmployeesExperience } from "@/components/employees/EmployeesExperience";
import { RewardHistoryPage } from "@/components/app/SecondaryPages";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { GoodyCatalogProduct } from "@/lib/goody/client";

type View =
  | "dashboard"
  | "employees"
  | "celebrations"
  | "rewards"
  | "reward-history"
  | "perkjoy-local"
  | "rules"
  | "reports"
  | "team"
  | "billing"
  | "settings";

const nav: {
  view: View;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}[] = [
  {
    view: "dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  { view: "employees", label: "Employees", icon: Users, href: "/employees" },
  {
    view: "celebrations",
    label: "Celebrations",
    icon: CalendarDays,
    href: "/celebrations",
  },
  { view: "rewards", label: "Rewards", icon: Gift, href: "/rewards" },
  {
    view: "perkjoy-local",
    label: "PerkJoy Local",
    icon: Store,
    href: "/perkjoy-local",
  },
  { view: "rules", label: "Automation Rules", icon: Zap, href: "/rules" },
  { view: "reports", label: "Reports", icon: BarChart3, href: "/reports" },
  { view: "team", label: "Team", icon: Building2, href: "/team" },
  { view: "billing", label: "Billing", icon: CreditCard, href: "/billing" },
  { view: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

type Celebration = {
  employee: Employee;
  type: "Birthday" | "Anniversary";
  date: Date;
  label: string;
  amount: number;
  tone: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
function initials(employee: Employee) {
  return `${employee.firstName[0]}${employee.lastName[0]}`;
}
function fullName(employee?: Employee) {
  return employee
    ? `${employee.firstName} ${employee.lastName}`
    : "Unknown employee";
}

export function AppShell({ view = "dashboard" }: { view?: View }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [modal, setModal] = useState<
    | "employee"
    | "recognize"
    | "quick"
    | "concierge"
    | "order"
    | "team"
    | "rule"
    | null
  >(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  async function signOut() {
    setBusy(true);
    const { error: signOutError } = await createBrowserSupabaseClient().auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setBusy(false);
      return;
    }
    window.location.assign("/login");
  }

  async function load() {
    try {
      const response = await authenticatedFetch("/api/workspace", {
        cache: "no-store",
      });
      const json = (await response.json()) as Workspace & { error?: string };
      if (!response.ok)
        throw new Error(json.error || "Unable to load workspace");
      setData(json);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load workspace",
      );
    }
  }

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as Workspace & { error?: string };
      if (!response.ok) throw new Error(json.error || "Unable to save change");
      setData(json);
      if (payload.action !== "generateRecommendation") setModal(null);
      return json;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save change",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    authenticatedFetch("/api/workspace", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as Workspace & { error?: string };
        if (!response.ok)
          throw new Error(json.error || "Unable to load workspace");
        if (active) {
          setData(json);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load workspace",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const celebrations = useMemo<Celebration[]>(() => {
    if (!data) return [];
    return data.employees
      .flatMap((employee, index) => {
        const birthday = nextBirthday(employee);
        const anniversary = nextAnniversary(employee);
        const moments: Celebration[] = [];
        if (birthday) moments.push({
            employee,
            type: "Birthday" as const,
            date: birthday,
            label: "Birthday",
            amount: 5000,
            tone: ["coral", "purple", "green"][index % 3],
          });
        if (anniversary) moments.push({
            employee,
            type: "Anniversary" as const,
            date: anniversary.date,
            label: `${anniversary.years} Year Anniversary`,
            amount: 7500,
            tone: "gold",
          });
        return moments;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [data]);

  if (!data && !error) return <AppSkeleton />;

  return (
    <div className="app-page">
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <Link href="/">
            <Logo />
          </Link>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <nav className="app-nav">
          <small>WORKSPACE</small>
          {nav.slice(0, 7).map((item) => (
            <Link
              className={item.view === view ? "active" : ""}
              href={item.href}
              key={item.view}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon />
              {item.label}
              {item.view === "celebrations" && <em>8</em>}
            </Link>
          ))}
          <Link className={view === "reward-history" ? "active" : ""} href="/rewards/history" onClick={() => setMobileOpen(false)}>
            <History />
            Reward History
          </Link>
          <small>MANAGE</small>
          {nav.slice(7).map((item) => (
            <Link
              className={item.view === view ? "active" : ""}
              href={item.href}
              key={item.view}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon />
              {item.label}
            </Link>
          ))}
          {data?.access.roles.includes("SUPER_ADMIN") && (
            <Link href="/perkjoy-admin" onClick={() => setMobileOpen(false)}>
              <ShieldCheck />
              PerkJoy Admin
            </Link>
          )}
        </nav>
        <div className="sidebar-card">
          <span>
            <Sparkles />
          </span>
          <b>Moments handled</b>
          <p>12 celebrations handled this quarter.</p>
          <div>
            <i style={{ width: "78%" }} />
          </div>
        </div>
        <ThemeToggle />
        <div className="sidebar-user">
          <span>
            {data?.organization.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "PJ"}
          </span>
          <div>
            <b>{data?.organization.name ?? "PerkJoy workspace"}</b>
            <small>Authenticated owner</small>
          </div>
          <button onClick={signOut} disabled={busy} aria-label="Sign out">
            <LogOut />
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <section className="app-workspace">
        <header className="app-topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="company-switcher">
            <span>PC</span>
            <b>{data?.organization.name}</b>
            <ChevronDown />
          </div>
          <div className="topbar-actions">
            <button aria-label="Search">
              <Search />
            </button>
            <button
              className="notification-button"
              onClick={() => setNotificationOpen(true)}
              aria-label={`Notifications${data?.notifications.filter((item) => !item.readAt).length ? `, ${data.notifications.filter((item) => !item.readAt).length} unread` : ""}`}
            >
              <Bell />
              {data?.notifications.some((item) => !item.readAt) && <i />}
            </button>
            <button
              className="button button-primary recognize-top"
              onClick={() => {
                setSelectedEmployee(data?.employees[0]?.id ?? "");
                setModal("recognize");
              }}
            >
              <Plus /> Celebrate Someone
            </button>
          </div>
        </header>
        <main className="app-content">
          {error && (
            <div className="app-error">
              <span>{error}</span>
              <button onClick={load}>Try again</button>
            </div>
          )}
          {data && (
            <ViewContent
              view={view}
              data={data}
              celebrations={celebrations}
              mutate={mutate}
              openEmployee={() => setModal("employee")}
              openRecognize={(id) => {
                setSelectedEmployee(id ?? data.employees[0]?.id ?? "");
                setModal("recognize");
              }}
              openQuick={(id) => {
                setSelectedEmployee(id ?? data.employees[0]?.id ?? "");
                setModal("quick");
              }}
              openConcierge={(id) => {
                setSelectedEmployee(id ?? data.employees[0]?.id ?? "");
                setModal("concierge");
              }}
              openOrder={(product) => {
                setSelectedProduct(product);
                setSelectedEmployee(data.employees[0]?.id ?? "");
                setModal("order");
              }}
              openTeam={() => setModal("team")}
              openRule={() => setModal("rule")}
            />
          )}
        </main>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Mobile app navigation">
        <Link href="/dashboard">
          <LayoutDashboard />
          <span>Dashboard</span>
        </Link>
        <Link href="/celebrations">
          <CalendarDays />
          <span>Calendar</span>
        </Link>
        <button
          onClick={() => {
            setSelectedEmployee(data?.employees[0]?.id ?? "");
            setModal("recognize");
          }}
        >
          <Plus />
          <span>Celebrate</span>
        </button>
        <Link href="/employees">
          <Users />
          <span>Employees</span>
        </Link>
        <button onClick={() => setMobileOpen(true)}>
          <Menu />
          <span>More</span>
        </button>
      </nav>

      {modal === "employee" && (
        <AddEmployeeModal
          busy={busy}
          close={() => setModal(null)}
          submit={mutate}
        />
      )}
      {modal === "recognize" && data && (
        <RecognitionModal
          employees={data.employees}
          selected={selectedEmployee}
          setSelected={setSelectedEmployee}
          busy={busy}
          close={() => setModal(null)}
          submit={mutate}
        />
      )}
      {modal === "quick" && data && (
        <QuickCelebrateModal
          data={data}
          selected={selectedEmployee}
          setSelected={setSelectedEmployee}
          busy={busy}
          close={() => setModal(null)}
          submit={mutate}
        />
      )}
      {modal === "concierge" && data && (
        <ConciergeModal
          employees={data.employees}
          selected={selectedEmployee}
          setSelected={setSelectedEmployee}
          busy={busy}
          close={() => setModal(null)}
          submit={mutate}
        />
      )}
      {modal === "order" && data && selectedProduct && (
        <OrderModal
          employees={data.employees}
          product={selectedProduct}
          selected={selectedEmployee}
          setSelected={setSelectedEmployee}
          close={() => setModal(null)}
        />
      )}
      {modal === "team" && data && (
        <TeamCelebrationModal
          employees={data.employees}
          busy={busy}
          close={() => setModal(null)}
          submit={mutate}
        />
      )}
      {modal === "rule" && data && (
        <RuleModal
          celebrationTypes={data.celebrationTypes}
          busy={busy}
          close={() => setModal(null)}
          submit={mutate}
        />
      )}
      {notificationOpen && data && (
        <NotificationCenter
          data={data}
          close={() => setNotificationOpen(false)}
          mutate={mutate}
        />
      )}
    </div>
  );
}

function ViewContent({
  view,
  data,
  celebrations,
  mutate,
  openEmployee,
  openRecognize,
  openQuick,
  openConcierge,
  openOrder,
  openTeam,
  openRule,
}: {
  view: View;
  data: Workspace;
  celebrations: Celebration[];
  mutate: (
    payload: Record<string, unknown>,
  ) => Promise<(Workspace & { profileInviteUrl?: string }) | undefined>;
  openEmployee: () => void;
  openRecognize: (id?: string) => void;
  openQuick: (id?: string) => void;
  openConcierge: (id?: string) => void;
  openOrder: (product: Product) => void;
  openTeam: () => void;
  openRule: () => void;
}) {
  if (view === "dashboard")
    return <Dashboard data={data} mutate={mutate} openQuick={openQuick} />;
  if (view === "employees")
    return (
      <EmployeesView
        data={data}
        celebrations={celebrations}
        openEmployee={openEmployee}
        openRecognize={openRecognize}
        mutate={mutate}
      />
    );
  if (view === "celebrations")
    return <CelebrationsView data={data} mutate={mutate} />;
  if (view === "rewards")
    return <RewardsView data={data} openRecognize={openRecognize} />;
  if (view === "reward-history") return <RewardHistoryPage />;
  if (view === "perkjoy-local")
    return (
      <PhaseDLocalView
        data={data}
        openOrder={openOrder}
        openConcierge={openConcierge}
      />
    );
  if (view === "rules")
    return (
      <>
        <RulesView data={data} mutate={mutate} openRule={openRule} />
        <AutomationOperations data={data} mutate={mutate} />
      </>
    );
  if (view === "reports") return <ReportsView data={data} />;
  if (view === "team")
    return <PhaseETeamView data={data} mutate={mutate} openTeam={openTeam} />;
  if (view === "billing") return <BillingView />;
  return <SettingsView data={data} mutate={mutate} />;
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="app-page-head">
      <div>
        {eyebrow && <small>{eyebrow}</small>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function eventStatusLabel(status: string) {
  return (
    (
      {
        needs_attention: "Needs Attention",
        scheduled: "Scheduled",
        approval_required: "Approval Required",
        handled: "Handled",
        delivered: "Delivered",
        skipped: "Skipped",
      } as Record<string, string>
    )[status] ?? status
  );
}

function Dashboard({
  data,
  mutate,
  openQuick,
}: {
  data: Workspace;
  mutate: (payload: Record<string, unknown>) => void;
  openQuick: (id?: string) => void;
}) {
  const [today] = useState(() => new Date());
  const monthRewards = data.rewards.filter((reward) =>
    isSameMonth(new Date(reward.createdAt), today),
  );
  const spend =
    monthRewards.reduce((sum, reward) => sum + reward.amountCents, 0) +
    data.localOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const handled = data.events.filter((event) =>
    ["scheduled", "handled", "delivered"].includes(event.status),
  );
  const attention = data.events.filter(
    (event) => event.status === "needs_attention",
  );
  const pendingApprovals = data.approvals.filter(
    (approval) => approval.status === "pending",
  );
  const health = data.events.length
    ? Math.round((handled.length / data.events.length) * 100)
    : 100;
  const quickRecommendation =
    data.recommendations.find(
      (recommendation) => recommendation.status === "recommended",
    ) ?? data.recommendations[0];
  return (
    <>
      <PageHeader
        eyebrow="CELEBRATION OPERATING SYSTEM"
        title="PerkJoy has this handled."
        description="You hire the people. PerkJoy remembers the moments."
        action={
          <div className="header-date">
            <CalendarDays />
            <span>
              <small>Today</small>
              <b>{format(today, "EEEE, MMMM d")}</b>
            </span>
          </div>
        }
      />
      <section className="handled-hero app-card">
        <div>
          <span>
            <CheckCircle2 />
          </span>
          <div>
            <small>MOMENTS HANDLED THIS MONTH</small>
            <h2>{handled.length} moments handled</h2>
            <p>
              {handled.length} of {data.events.length} upcoming celebrations are
              already on track.
            </p>
          </div>
        </div>
        <div className="health-score">
          <span
            style={{ "--health": `${health * 3.6}deg` } as React.CSSProperties}
          >
            <b>{health}%</b>
          </span>
          <div>
            <small>CELEBRATION HEALTH</small>
            <b>
              {health >= 90
                ? "Excellent"
                : health >= 70
                  ? "Good"
                  : "Needs Attention"}
            </b>
            <p>
              Are we taking care of our people? Yes—with {attention.length} next
              step{attention.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
      </section>
      <div className="dashboard-priority-grid">
        <section className="app-card moment-calendar">
          <div className="card-head">
            <div>
              <h2>What&apos;s Coming Up</h2>
              <p>Every moment, reward, and status in one place.</p>
            </div>
            <Link href="/celebrations">Open calendar →</Link>
          </div>
          <div className="moment-list">
            {data.events.slice(0, 5).map((event) => {
              const employee = data.employees.find(
                (item) => item.id === event.employeeId,
              );
              const date = new Date(`${event.eventDate}T12:00:00`);
              return (
                <article key={event.id}>
                  <div className="moment-when">
                    <b>{formatDistanceToNow(date, { addSuffix: false })}</b>
                    <small>{format(date, "MMM d")}</small>
                  </div>
                  <span className="avatar avatar-coral">
                    {employee ? initials(employee) : "?"}
                  </span>
                  <div className="moment-name">
                    <b>{event.title}</b>
                    <small>
                      {event.category === "life"
                        ? "Life event"
                        : "Career event"}
                    </small>
                  </div>
                  <div className="moment-reward">
                    <b>{event.rewardSummary}</b>
                    <small>
                      {event.status === "needs_attention"
                        ? "PerkJoy needs one choice"
                        : "PerkJoy is tracking every step"}
                    </small>
                  </div>
                  <em className={`moment-status ${event.status}`}>
                    {eventStatusLabel(event.status)}
                  </em>
                  {event.status === "needs_attention" && (
                    <button
                      className="button button-primary button-small"
                      onClick={() =>
                        mutate({ action: "handleEvent", eventId: event.id })
                      }
                    >
                      Handle This
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        <aside className="attention-stack">
          <section className="app-card attention-card">
            <div className="card-head">
              <div>
                <h2>Needs Your Attention</h2>
                <p>Only the things that need a human.</p>
              </div>
              <span>{attention.length + pendingApprovals.length}</span>
            </div>
            {attention.map((event) => (
              <article key={event.id}>
                <AlertTriangle />
                <div>
                  <b>{event.title} is coming up.</b>
                  <p>No celebration is scheduled.</p>
                </div>
                <button
                  onClick={() =>
                    mutate({ action: "handleEvent", eventId: event.id })
                  }
                >
                  Handle This
                </button>
              </article>
            ))}
            {pendingApprovals.map((approval) => {
              const recommendation = data.recommendations.find(
                (item) => item.id === approval.entityId,
              );
              return (
                <article key={approval.id}>
                  <ShieldCheck />
                  <div>
                    <b>{recommendation?.title ?? "A reward"} needs approval.</b>
                    <p>
                      {money(approval.amountCents)} · {approval.approvalLevel}{" "}
                      approval
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      mutate({
                        action: "approveRequest",
                        approvalId: approval.id,
                      })
                    }
                  >
                    Approve
                  </button>
                </article>
              );
            })}
            {!attention.length && !pendingApprovals.length && (
              <div className="all-handled">
                <Check />
                <b>You&apos;re all caught up.</b>
                <p>We&apos;ll let you know when the next moment needs you.</p>
              </div>
            )}
          </section>
          <section className="app-card quick-celebrate-card">
            <div>
              <span>
                <WandSparkles />
              </span>
              <small>QUICK CELEBRATE</small>
              <h2>
                {quickRecommendation
                  ? `Celebrate ${data.employees.find((employee) => employee.id === quickRecommendation.employeeId)?.firstName}`
                  : "Celebrate someone"}
              </h2>
              <p>
                {quickRecommendation
                  ? quickRecommendation.title
                  : "Pick an employee and PerkJoy will recommend the reward."}
              </p>
            </div>
            {quickRecommendation && (
              <div className="recommendation-reason">
                <b>Why this?</b>
                <p>{quickRecommendation.recommendationReason}</p>
                {quickRecommendation.somethingDifferent && (
                  <em>Something different this year</em>
                )}
              </div>
            )}
            <button
              className="button button-dark"
              onClick={() => openQuick(quickRecommendation?.employeeId)}
            >
              Quick Celebrate
            </button>
          </section>
        </aside>
      </div>
      <section className="app-card handled-detail">
        <div className="card-head">
          <div>
            <h2>PerkJoy Has It Handled</h2>
            <p>Confidence without the follow-up.</p>
          </div>
          <span>
            <Sparkles /> {handled.length} celebrations on track
          </span>
        </div>
        {data.events
          .filter((event) => event.handledSteps !== "[]")
          .slice(0, 3)
          .map((event) => (
            <article key={event.id}>
              <div>
                <b>{event.title}</b>
                <small>
                  {format(new Date(`${event.eventDate}T12:00:00`), "MMMM d")}
                </small>
              </div>
              <div>
                {(JSON.parse(event.handledSteps) as string[]).map(
                  (step, index, steps) => (
                    <span key={step}>
                      {index === steps.length - 1 &&
                      event.status === "scheduled" ? (
                        <i className="pending-step" />
                      ) : (
                        <Check />
                      )}{" "}
                      {step}
                    </span>
                  ),
                )}
              </div>
              <em className={`moment-status ${event.status}`}>
                {eventStatusLabel(event.status)}
              </em>
            </article>
          ))}
      </section>
      <div className="dashboard-bottom-grid">
        <ActivityCard data={data} />
        <BudgetCard data={data} spend={spend} />
      </div>
    </>
  );
}

function BudgetCard({ data, spend }: { data: Workspace; spend: number }) {
  const pct = Math.min(
    100,
    Math.round((spend / data.organization.monthlyBudgetCents) * 100),
  );
  return (
    <section className="app-card budget-card">
      <div className="card-head">
        <div>
          <h2>Monthly budget</h2>
          <p>August recognition spend</p>
        </div>
        <button>
          <MoreHorizontal />
        </button>
      </div>
      <div
        className="budget-ring"
        style={{ "--progress": `${pct * 3.6}deg` } as React.CSSProperties}
      >
        <div>
          <small>Remaining</small>
          <b>
            {money(Math.max(0, data.organization.monthlyBudgetCents - spend))}
          </b>
        </div>
      </div>
      <div className="budget-detail">
        <span>
          <i className="committed" />
          Committed<b>{money(spend)}</b>
        </span>
        <span>
          <i className="remaining" />
          Budget<b>{money(data.organization.monthlyBudgetCents)}</b>
        </span>
      </div>
      <Link href="/settings">
        Manage budget <span>→</span>
      </Link>
    </section>
  );
}

function ActivityCard({ data }: { data: Workspace }) {
  const latest = data.rewards.slice(0, 3);
  return (
    <section className="app-card activity-card">
      <div className="card-head">
        <div>
          <h2>Recent activity</h2>
          <p>Recognition across your team</p>
        </div>
      </div>
      <div>
        {latest.map((reward) => {
          const employee = data.employees.find(
            (item) => item.id === reward.employeeId,
          );
          return (
            <span key={reward.id}>
              <i className="activity-icon">
                <Award />
              </i>
              <p>
                <b>{fullName(employee)}</b> was recognized for{" "}
                {reward.recognitionType}
                <small>
                  {formatDistanceToNow(new Date(reward.createdAt), {
                    addSuffix: true,
                  })}
                </small>
              </p>
              <em>{money(reward.amountCents)}</em>
            </span>
          );
        })}
      </div>
      <Link href="/rewards">View all activity →</Link>
    </section>
  );
}

function EmployeesView({
  data,
  celebrations,
  openEmployee,
  openRecognize,
  mutate,
}: {
  data: Workspace;
  celebrations: Celebration[];
  openEmployee: () => void;
  openRecognize: (id?: string) => void;
  mutate: (
    payload: Record<string, unknown>,
  ) => Promise<(Workspace & { profileInviteUrl?: string }) | undefined>;
}) {
  void celebrations;
  void openEmployee;
  return <EmployeesExperience data={data} mutate={mutate} openRecognize={openRecognize} />;
  /* Legacy employee list kept below for reference while the new experience settles.
  const [query, setQuery] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const filtered = data.employees.filter(
    (e) =>
      fullName(e).toLowerCase().includes(query.toLowerCase()) ||
      e.department.toLowerCase().includes(query.toLowerCase()),
  );
  async function createInvite(employeeId: string) {
    const result = await mutate({ action: "refreshProfileInvite", employeeId });
    if (result?.profileInviteUrl) setInviteLink(result.profileInviteUrl);
  }
  return (
    <>
      <PageHeader
        eyebrow="PEOPLE"
        title="Employees"
        description="Manage your team, their moments, and private Celebration Profile invitations."
        action={
          <div className="head-actions">
            <button className="button button-secondary">Import CSV</button>
            <button className="button button-primary" onClick={openEmployee}>
              <Plus /> Add employee
            </button>
          </div>
        }
      />
      <div className="profile-privacy-banner">
        <ShieldCheck />
        <div>
          <b>Private by design</b>
          <p>
            Private preferences and dietary selections are used for
            recommendations but never shown to unauthorized managers.
          </p>
        </div>
      </div>
      {inviteLink && (
        <div className="profile-link-ready">
          <Check />
          <div>
            <b>Secure profile link ready</b>
            <small>
              This link expires in 7 days. Send it directly to the employee.
            </small>
            <code>{inviteLink}</code>
          </div>
          <button onClick={() => navigator.clipboard.writeText(inviteLink)}>
            Copy link
          </button>
          <Link href={inviteLink}>Open form</Link>
        </div>
      )}
      <div className="toolbar">
        <label>
          <Search />
          <input
            placeholder="Search employees"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select aria-label="Department">
          <option>All departments</option>
          <option>Design</option>
          <option>Engineering</option>
        </select>
        <select aria-label="Status">
          <option>Active employees</option>
        </select>
        <span>{filtered.length} people</span>
      </div>
      <section className="app-card data-table profile-table">
        <div className="table-row table-head">
          <span>Employee</span>
          <span>Department</span>
          <span>Work mode</span>
          <span>Next moment</span>
          <span>Celebration Profile</span>
          <span>Status</span>
          <span />
        </div>
        {filtered.map((employee) => {
          const next = data.events.find(
            (event) => event.employeeId === employee.id,
          );
          const profile = data.profiles.find(
            (item) => item.employeeId === employee.id,
          );
          return (
            <div className="table-row" key={employee.id}>
              <span className="employee-cell">
                <i className="avatar avatar-coral">{initials(employee)}</i>
                <p>
                  <b>{fullName(employee)}</b>
                  <small>{employee.email}</small>
                </p>
              </span>
              <span>
                <b>{employee.department}</b>
                <small>{employee.jobTitle}</small>
              </span>
              <span>
                <b className="capitalize">{profile?.workMode ?? "office"}</b>
                <small>{profile?.preferredDelivery.replace("_", " ")}</small>
              </span>
              <span>
                <b>
                  {next?.title ??
                    celebrations.find((c) => c.employee.id === employee.id)
                      ?.label}
                </b>
                <small>
                  {next
                    ? format(new Date(`${next.eventDate}T12:00:00`), "MMM d")
                    : "Watching calendar"}
                </small>
              </span>
              <span>
                <div className="profile-completeness">
                  <b>{profile?.completeness ?? 0}%</b>
                  <i>
                    <span style={{ width: `${profile?.completeness ?? 0}%` }} />
                  </i>
                </div>
                <button onClick={() => createInvite(employee.id)}>
                  {profile?.completeness
                    ? "Update profile link"
                    : "Create profile link"}
                </button>
              </span>
              <span>
                <em className="status-badge active">
                  <i /> Active
                </em>
              </span>
              <span>
                <button
                  className="icon-button"
                  onClick={() => openRecognize(employee.id)}
                  aria-label={`Celebrate ${fullName(employee)}`}
                >
                  <Award />
                </button>
              </span>
            </div>
          );
        })}
      </section>
      <section className="employee-profile-links">
        <div>
          <small>DETAILED PROFILES</small>
          <h2>Open an employee&apos;s full celebration record.</h2>
        </div>
        <div>
          {filtered.map((employee) => (
            <Link href={`/employees/${employee.id}`} key={employee.id}>
              <span className="avatar avatar-coral">{initials(employee)}</span>
              <span>
                <b>{fullName(employee)}</b>
                <small>{employee.jobTitle}</small>
              </span>
              <em>View profile →</em>
            </Link>
          ))}
        </div>
      </section>
      <div className="profile-invite-help">
        <div>
          <Sparkles />
          <span>
            <b>Create Your Celebration Profile</b>
            <small>
              Employees receive a secure, expiring link. They do not need a
              company account.
            </small>
          </span>
        </div>
        <small>Raw invitation tokens are shown once and never stored.</small>
      </div>
    </>
  ); */
}

function CelebrationsView({
  data,
  mutate,
}: {
  data: Workspace;
  mutate: (payload: Record<string, unknown>) => void;
}) {
  const career = data.celebrationTypes.filter(
    (type) => type.category === "career",
  );
  const life = data.celebrationTypes.filter((type) => type.category === "life");
  return (
    <>
      <PageHeader
        eyebrow="CELEBRATION CALENDAR"
        title="What's Coming Up"
        description="Every employee, event, reward, and status—at a glance."
        action={
          <div className="segmented">
            <button className="active">Upcoming</button>
            <button>Month</button>
          </div>
        }
      />
      <div className="calendar-summary">
        <span>
          <CakeSlice />{" "}
          <b>
            {data.events.filter((event) => event.category === "life").length}
          </b>{" "}
          life events
        </span>
        <span>
          <Award />{" "}
          <b>
            {data.events.filter((event) => event.category === "career").length}
          </b>{" "}
          career events
        </span>
        <span>
          <CheckCircle2 />{" "}
          <b>
            {
              data.events.filter((event) =>
                ["scheduled", "handled", "delivered"].includes(event.status),
              ).length
            }
          </b>{" "}
          handled
        </span>
      </div>
      <section className="app-card enhanced-timeline">
        {data.events.map((event, index) => {
          const employee = data.employees.find(
            (item) => item.id === event.employeeId,
          );
          const steps = JSON.parse(event.handledSteps) as string[];
          return (
            <article key={event.id}>
              <span className="timeline-line">
                {index !== data.events.length - 1 && <i />}
              </span>
              <div
                className={`date-block ${event.category === "life" ? "coral" : "gold"}`}
              >
                <small>
                  {format(new Date(`${event.eventDate}T12:00:00`), "MMM")}
                </small>
                <b>{format(new Date(`${event.eventDate}T12:00:00`), "dd")}</b>
              </div>
              <span className="avatar avatar-green">
                {employee ? initials(employee) : "?"}
              </span>
              <div className="calendar-event-detail">
                <b>{event.title}</b>
                <p>
                  {employee?.department} · {event.rewardSummary}
                </p>
                {steps.length > 0 && (
                  <small>
                    {steps.map((step) => `✓ ${step}`).join("  ·  ")}
                  </small>
                )}
              </div>
              <em>
                {formatDistanceToNow(new Date(`${event.eventDate}T12:00:00`), {
                  addSuffix: true,
                })}
              </em>
              <span className={`moment-status ${event.status}`}>
                {eventStatusLabel(event.status)}
              </span>
              {event.status === "needs_attention" && (
                <button
                  className="button button-primary button-small"
                  onClick={() =>
                    mutate({ action: "handleEvent", eventId: event.id })
                  }
                >
                  Handle This
                </button>
              )}
            </article>
          );
        })}
      </section>
      <section className="app-card celebration-type-manager">
        <div className="card-head">
          <div>
            <h2>What should PerkJoy remember?</h2>
            <p>
              Enable the celebration types that fit your company. Life events
              are added manually or volunteered by employees.
            </p>
          </div>
        </div>
        <div>
          <fieldset>
            <legend>Career events</legend>
            {career.map((type) => (
              <label key={type.id}>
                <span>
                  <b>{type.name}</b>
                  <small>
                    {type.manualOnly ? "Added by managers" : "Can be automated"}
                  </small>
                </span>
                <button
                  className={`switch ${type.active ? "on" : ""}`}
                  onClick={() =>
                    mutate({ action: "toggleCelebrationType", typeId: type.id })
                  }
                  aria-label={`Toggle ${type.name}`}
                >
                  <i />
                </button>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Life events</legend>
            {life.map((type) => (
              <label key={type.id}>
                <span>
                  <b>{type.name}</b>
                  <small>
                    {type.manualOnly
                      ? "Voluntary or manually added"
                      : "Can be automated"}
                  </small>
                </span>
                <button
                  className={`switch ${type.active ? "on" : ""}`}
                  onClick={() =>
                    mutate({ action: "toggleCelebrationType", typeId: type.id })
                  }
                  aria-label={`Toggle ${type.name}`}
                >
                  <i />
                </button>
              </label>
            ))}
          </fieldset>
        </div>
      </section>
    </>
  );
}

function RewardsView({
  data,
  openRecognize,
}: {
  data: Workspace;
  openRecognize: (id?: string) => void;
}) {
  const [goodyProducts, setGoodyProducts] = useState<GoodyCatalogProduct[]>([]);
  const [goodyLoading, setGoodyLoading] = useState(true);
  const [goodyError, setGoodyError] = useState("");
  const [selectedGoody, setSelectedGoody] = useState<GoodyCatalogProduct | null>(null);

  useEffect(() => {
    let active = true;
    authenticatedFetch("/api/goody/products", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json() as { products?: GoodyCatalogProduct[]; error?: string };
        if (!response.ok) throw new Error(json.error || "Unable to load Goody rewards.");
        if (active) setGoodyProducts(json.products ?? []);
      })
      .catch((reason) => active && setGoodyError(reason instanceof Error ? reason.message : "Unable to load Goody rewards."))
      .finally(() => active && setGoodyLoading(false));
    return () => { active = false; };
  }, []);

  const canPurchase = data.access.roles.some((role) => role === "SUPER_ADMIN" || role === "ADMIN");
  return (
    <>
      <PageHeader
        eyebrow="RECOGNITION"
        title="Rewards"
        description="Track every thank-you, celebration, and delivery."
        action={
          <button
            className="button button-primary"
            onClick={() => openRecognize()}
          >
            <Plus /> Send recognition
          </button>
        }
      />
      <div className="reward-stats">
        <article>
          <Gift />
          <div>
            <small>Total sent</small>
            <b>{data.rewards.length}</b>
          </div>
        </article>
        <article>
          <CircleDollarSign />
          <div>
            <small>Reward volume</small>
            <b>{money(data.rewards.reduce((s, r) => s + r.amountCents, 0))}</b>
          </div>
        </article>
        <article>
          <Check />
          <div>
            <small>Delivery rate</small>
            <b>100%</b>
          </div>
        </article>
      </div>
      <section className="app-card data-table rewards-table">
        <div className="table-row table-head">
          <span>Recipient</span>
          <span>Recognition</span>
          <span>Reward</span>
          <span>Provider</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {data.rewards.map((reward) => {
          const employee = data.employees.find(
            (e) => e.id === reward.employeeId,
          );
          return (
            <div className="table-row" key={reward.id}>
              <span className="employee-cell">
                <i className="avatar avatar-coral">
                  {employee ? initials(employee) : "?"}
                </i>
                <p>
                  <b>{fullName(employee)}</b>
                  <small>{employee?.email}</small>
                </p>
              </span>
              <span>
                <b>{reward.recognitionType}</b>
                <small>{reward.message}</small>
              </span>
              <span>
                <b>{money(reward.amountCents)}</b>
              </span>
              <span>{reward.provider.replace("_", " ")}</span>
              <span>{format(new Date(reward.createdAt), "MMM d, yyyy")}</span>
              <span>
                <em className="status-badge active">
                  <i /> {reward.status}
                </em>
              </span>
            </div>
          );
        })}
      </section>
      <section className="goody-catalog-section">
        <div className="card-head">
          <div>
            <small>GOODY REWARD MARKETPLACE</small>
            <h2>Send a gift they can unwrap online</h2>
            <p>Goody emails the recipient a gift link. They choose where it ships and can swap eligible gifts.</p>
          </div>
          <span className="goody-live-badge"><i /> Live catalog</span>
        </div>
        {goodyLoading && <div className="goody-catalog-message">Loading Goody rewards…</div>}
        {goodyError && <div className="app-error"><span>{goodyError}</span></div>}
        {!goodyLoading && !goodyError && (
          <div className="goody-catalog-grid">
            {goodyProducts.slice(0, 12).map((product) => (
              <article key={product.id}>
                <div className="goody-product-image">
                  {product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 25vw" unoptimized /> : <Gift />}
                  <span>Goody</span>
                </div>
                <div>
                  <small>{product.brandName}</small>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="goody-price">
                    <b>{product.variablePrice ? "From " : ""}{money(product.priceCents)}</b>
                    {product.shippingCents > 0 && <small>+ {money(product.shippingCents)} shipping</small>}
                  </div>
                  <button className="button button-primary" disabled={!canPurchase} onClick={() => setSelectedGoody(product)}>
                    {canPurchase ? "Send this reward" : "Admin purchase required"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <div className="sandbox-note goody-production-note">
        <ShieldCheck />{" "}
        <div>
          <b>Goody production gifting is connected</b>
          <p>
            The catalog is live. A Goody purchase is only made after an authorized admin reviews and confirms the recipient and total.
          </p>
        </div>
      </div>
      {selectedGoody && (
        <GoodyOrderModal
          data={data}
          product={selectedGoody}
          close={() => setSelectedGoody(null)}
        />
      )}
    </>
  );
}

function GoodyOrderModal({ data, product, close }: { data: Workspace; product: GoodyCatalogProduct; close: () => void }) {
  const [employeeId, setEmployeeId] = useState(data.employees[0]?.id ?? "");
  const [message, setMessage] = useState("Thank you for everything you do!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [giftLink, setGiftLink] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/goody/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, productId: product.id, message, requestId: crypto.randomUUID() }),
      });
      const result = await response.json() as { giftLink?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send this Goody reward.");
      setGiftLink(result.giftLink ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send this Goody reward.");
    } finally {
      setBusy(false);
    }
  }

  if (giftLink) {
    return (
      <ModalShell title="Goody reward sent" description="Goody emailed the gift to the recipient. You can also open or copy the gift link." close={close}>
        <div className="goody-success">
          <CheckCircle2 />
          <h3>Gift created successfully</h3>
          <p>The reward is now tracked in PerkJoy. Goody webhook updates will keep its delivery status current.</p>
          <div>
            <a className="button button-primary" href={giftLink} target="_blank" rel="noreferrer">Open gift link</a>
            <button className="button button-secondary" type="button" onClick={() => navigator.clipboard.writeText(giftLink)}>Copy link</button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Send with Goody" description="This uses the live Goody account and may create a real charge." close={close}>
      <form onSubmit={submit}>
        <div className="selected-product goody-selected-product">
          <Gift />
          <div><small>{product.brandName}</small><b>{product.name}</b><p>Recipient enters their shipping address</p></div>
          <b>{product.variablePrice ? "From " : ""}{money(product.priceCents + product.shippingCents)}</b>
        </div>
        <label>Recipient
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
            {data.employees.filter((employee) => employee.status === "active").map((employee) => <option key={employee.id} value={employee.id}>{fullName(employee)} — {employee.email}</option>)}
          </select>
        </label>
        <label>Gift message
          <textarea rows={4} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} required />
        </label>
        <div className="order-total">
          <span>Gift <b>{money(product.priceCents)}</b></span>
          <span>Estimated shipping <b>{money(product.shippingCents)}</b></span>
          <hr />
          <span>Estimated total <b>{money(product.priceCents + product.shippingCents)}</b></span>
        </div>
        <p className="privacy-note"><ShieldCheck /> Final tax or variable pricing is calculated by Goody. Confirming sends an email gift notification.</p>
        {error && <div className="app-error"><span>{error}</span></div>}
        <footer>
          <button type="button" className="button button-secondary" onClick={close}>Cancel</button>
          <button className="button button-primary" disabled={busy || !employeeId}>{busy ? "Sending…" : "Confirm and send"}</button>
        </footer>
      </form>
    </ModalShell>
  );
}

function LocalView({
  data,
  openOrder,
  openConcierge,
}: {
  data: Workspace;
  openOrder: (product: Product) => void;
  openConcierge: (id?: string) => void;
}) {
  const [category, setCategory] = useState("All");
  const categories = [
    "All",
    "Cakes & Treats",
    "Food & Lunch",
    "Flowers",
    "Celebration",
    "Gift Boxes",
    "Coffee",
    "Experiences",
  ];
  const filtered =
    category === "All"
      ? data.products
      : data.products.filter((product) => product.category === category);
  return (
    <>
      <div className="local-app-hero local-core-hero">
        <div>
          <span>
            <MapPinSmall /> Now launching in Philadelphia
          </span>
          <h1>
            Turn employee appreciation
            <br />
            into a real moment.
          </h1>
          <p>
            Cakes, flowers, lunches, gifts, and experiences from businesses in
            your city—with availability and delivery handled by PerkJoy.
          </p>
          <div>
            <button
              className="button button-light"
              onClick={() => openConcierge()}
            >
              Plan with Concierge
            </button>
            <small>More cities coming soon</small>
          </div>
        </div>
        <div className="local-app-art">
          <CakeSlice />
          <span>Made in Philly</span>
        </div>
      </div>
      <section className="market-switcher">
        {data.markets.map((market) => (
          <span className={market.active ? "active" : ""} key={market.id}>
            <b>{market.name}</b>
            <small>{market.active ? "Active" : "Coming soon"}</small>
          </span>
        ))}
      </section>
      <div className="marketplace-filters">
        <div className="local-categories">
          {categories.map((item) => (
            <button
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <div>
          <select aria-label="Occasion">
            <option>Any occasion</option>
            <option>Birthday</option>
            <option>Get well soon</option>
            <option>Team achievement</option>
            <option>New hire</option>
          </select>
          <select aria-label="Budget">
            <option>Any budget</option>
            <option>Under $50</option>
            <option>$50–$100</option>
            <option>$100+</option>
          </select>
          <input type="date" aria-label="Delivery date" />
          <label>
            <input type="checkbox" /> Preference match
          </label>
        </div>
      </div>
      <div className="catalog-grid enhanced-catalog">
        {filtered.map((product, index) => (
          <article key={product.id}>
            <div className={`catalog-art art-${(index % 3) + 1}`}>
              <span>
                {product.category === "Flowers"
                  ? "💐"
                  : product.category === "Food & Lunch"
                    ? "🍽️"
                    : product.category === "Coffee"
                      ? "☕"
                      : product.category === "Gift Boxes"
                        ? "🎁"
                        : index % 2
                          ? "🧁"
                          : "🎂"}
              </span>
              <em>Demo vendor</em>
            </div>
            <div>
              <small>{product.category}</small>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="catalog-meta">
                <span>Delivery available</span>
                <span>48–72 hr lead time</span>
                <span>★ 4.9</span>
              </div>
              <span>
                <b>{money(product.priceCents)}</b>
                <small> + {money(product.deliveryFeeCents)} delivery</small>
              </span>
              <button
                className="button button-primary"
                onClick={() => openOrder(product)}
              >
                Send this gift
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="bundle-section">
        <div className="card-head">
          <div>
            <small>PERKJOY BUNDLES</small>
            <h2>A whole celebration, already planned.</h2>
            <p>One vendor, one approval, every thoughtful detail.</p>
          </div>
        </div>
        <div className="bundle-grid">
          {data.bundles.map((bundle) => (
            <article className="app-card" key={bundle.id}>
              <span>
                {bundle.category === "Team"
                  ? "🥳"
                  : bundle.category === "Achievement"
                    ? "🏆"
                    : "🎂"}
              </span>
              <small>{bundle.vendorName}</small>
              <h3>{bundle.name}</h3>
              <p>{bundle.description}</p>
              <ul>
                {bundle.items.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Check /> {item.quantity > 1 ? `${item.quantity} ` : ""}
                    {item.name}
                  </li>
                ))}
              </ul>
              <footer>
                <b>
                  {money(bundle.customerPriceCents)}
                  {bundle.customerPriceCents >= 14900 ? "+" : ""}
                </b>
                <button className="button button-secondary">
                  Choose bundle
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <section className="concierge-banner">
        <div>
          <WandSparkles />
          <span>
            <small>PERKJOY CONCIERGE</small>
            <h2>
              Tell us the occasion and budget. We&apos;ll handle the rest.
            </h2>
            <p>
              PerkJoy uses employee preferences to plan a celebration, then asks
              for your approval before anything is purchased.
            </p>
          </span>
        </div>
        <button className="button button-light" onClick={() => openConcierge()}>
          Start a Concierge Request
        </button>
      </section>
      {data.localOrders.length > 0 && (
        <section className="app-card order-status">
          <div className="card-head">
            <div>
              <h2>Local gift orders</h2>
              <p>Availability, fulfillment, and delivery in one queue.</p>
            </div>
          </div>
          {data.localOrders.map((order) => (
            <div key={order.id}>
              <span className="activity-icon">
                <CakeSlice />
              </span>
              <p>
                <b>
                  {data.products.find((p) => p.id === order.productId)?.name}
                </b>
                <small>
                  For{" "}
                  {fullName(
                    data.employees.find((e) => e.id === order.employeeId),
                  )}{" "}
                  · Delivery{" "}
                  {format(new Date(`${order.deliveryDate}T12:00:00`), "MMM d")}
                </small>
              </p>
              <em className="status-badge active">
                {order.status === "delivered" ? "Delivered! 🎂" : order.status}
              </em>
              <b>{money(order.totalCents)}</b>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

void LocalView;

function PhaseDLocalView({
  data,
  openOrder,
  openConcierge,
}: {
  data: Workspace;
  openOrder: (product: Product) => void;
  openConcierge: (id?: string) => void;
}) {
  const activeMarket =
    data.markets.find((market) => market.active) ?? data.markets[0];
  const localEmployee =
    data.employees.find((employee) => {
      const assignment = data.employeeLocations.find(
        (item) => item.employeeId === employee.id,
      );
      const location = data.organizationLocations.find(
        (item) => item.id === assignment?.organizationLocationId,
      );
      return location?.marketId === activeMarket?.id;
    }) ?? data.employees[0];
  const [marketId, setMarketId] = useState(activeMarket?.id ?? "");
  const [employeeId, setEmployeeId] = useState(localEmployee?.id ?? "");
  const [category, setCategory] = useState("All");
  const [budget, setBudget] = useState("any");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [preferenceOnly, setPreferenceOnly] = useState(false);
  const categories = [
    "All",
    "Cakes & Treats",
    "Food & Lunch",
    "Flowers",
    "Celebration",
    "Gift Boxes",
    "Coffee",
    "Experiences",
  ];
  const market = data.markets.find((item) => item.id === marketId);
  const assignment = data.employeeLocations.find(
    (item) => item.employeeId === employeeId,
  );
  const location = data.organizationLocations.find(
    (item) => item.id === assignment?.organizationLocationId,
  );
  function dateAvailable(product: Product) {
    if (!deliveryDate) return true;
    const date = new Date(`${deliveryDate}T12:00:00`);
    return (
      date.getTime() >= Date.now() + product.minimumNoticeHours * 3600000 &&
      product.availableDays.includes(date.getDay()) &&
      !product.blackoutDates.includes(deliveryDate)
    );
  }
  const filtered = data.products.filter(
    (product) =>
      product.marketId === marketId &&
      (category === "All" || product.category === category) &&
      (budget === "under50"
        ? product.priceCents < 5000
        : budget === "50to100"
          ? product.priceCents >= 5000 && product.priceCents <= 10000
          : budget === "over100"
            ? product.priceCents > 10000
            : true) &&
      dateAvailable(product) &&
      (!preferenceOnly ||
        data.marketplaceMatches[employeeId]?.includes(product.id)),
  );
  const employeeEligible =
    location?.marketId === marketId &&
    data.profiles.find((profile) => profile.employeeId === employeeId)
      ?.preferredDelivery !== "digital_only";
  const marketBundles = data.bundles.filter(
    (bundle) => bundle.marketId === marketId,
  );
  return (
    <>
      <div className="local-app-hero local-core-hero">
        <div>
          <span>
            <MapPinSmall />{" "}
            {market?.active
              ? `Available in ${market.name}`
              : `${market?.name} · Coming soon`}
          </span>
          <h1>
            Turn employee appreciation
            <br />
            into a real moment.
          </h1>
          <p>
            Local gifts matched to the employee&apos;s celebration location,
            preferences, and a vendor who can actually deliver.
          </p>
          <div>
            <button
              className="button button-light"
              onClick={() => openConcierge(employeeId)}
            >
              Plan with Concierge
            </button>
            <small>
              {location
                ? `Delivering to ${location.name}`
                : "Choose an employee location"}
            </small>
          </div>
        </div>
        <div className="local-app-art">
          <CakeSlice />
          <span>
            {market?.active ? `Made in ${market.name}` : "Next market"}
          </span>
        </div>
      </div>
      <section className="market-switcher">
        {data.markets.map((item) => (
          <button
            className={item.id === marketId ? "active" : ""}
            onClick={() => setMarketId(item.id)}
            key={item.id}
          >
            <b>{item.name}</b>
            <small>{item.active ? "Active" : "Coming soon"}</small>
          </button>
        ))}
      </section>
      <div className="location-market-bar">
        <MapPinSmall />
        <label>
          Celebrating
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            {data.employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
        </label>
        <span>
          <b>{location?.name ?? "No location"}</b>
          <small>{location?.address ?? "Digital celebrations only"}</small>
        </span>
        <em className={employeeEligible ? "eligible" : "outside"}>
          {employeeEligible ? "Delivery match" : "Outside this market"}
        </em>
      </div>
      {!market?.active ? (
        <section className="market-coming-soon">
          <Store />
          <small>PERKJOY LOCAL</small>
          <h2>{market?.name} is coming soon.</h2>
          <p>
            Philadelphia is active now. We&apos;re opening new local vendor
            networks city by city.
          </p>
          <button className="button button-primary">
            Join the market waitlist
          </button>
        </section>
      ) : (
        <>
          <div className="marketplace-filters">
            <div className="local-categories">
              {categories.map((item) => (
                <button
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            <div>
              <select
                aria-label="Budget"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              >
                <option value="any">Any budget</option>
                <option value="under50">Under $50</option>
                <option value="50to100">$50–$100</option>
                <option value="over100">$100+</option>
              </select>
              <input
                type="date"
                aria-label="Delivery date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={preferenceOnly}
                  onChange={(event) => setPreferenceOnly(event.target.checked)}
                />{" "}
                Preference match
              </label>
            </div>
          </div>
          <div className="availability-summary">
            <CheckCircle2 />
            <span>
              <b>
                {filtered.length} available option
                {filtered.length === 1 ? "" : "s"}
              </b>
              <small>
                {deliveryDate
                  ? `Vendor schedules checked for ${format(new Date(`${deliveryDate}T12:00:00`), "MMMM d")}`
                  : "Choose a date to check live lead times and delivery days."}
              </small>
            </span>
          </div>
          <div className="catalog-grid enhanced-catalog">
            {filtered.map((product, index) => (
              <article key={product.id}>
                <div className={`catalog-art art-${(index % 3) + 1}`}>
                  <span>
                    {product.category === "Flowers"
                      ? "💐"
                      : product.category === "Food & Lunch"
                        ? "🍽️"
                        : product.category === "Coffee"
                          ? "☕"
                          : product.category === "Gift Boxes"
                            ? "🎁"
                            : index % 2
                              ? "🧁"
                              : "🎂"}
                  </span>
                  <em>{product.vendorName}</em>
                </div>
                <div>
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="catalog-meta">
                    <span>{product.minimumNoticeHours} hr notice</span>
                    <span>
                      {product.fulfillmentMethod.replaceAll("_", " ")}
                    </span>
                    <span>★ {product.rating.toFixed(1)}</span>
                    {data.marketplaceMatches[employeeId]?.includes(
                      product.id,
                    ) && <span>Preference match</span>}
                  </div>
                  <span>
                    <b>{money(product.priceCents)}</b>
                    <small> + {money(product.deliveryFeeCents)} delivery</small>
                  </span>
                  <button
                    className="button button-primary"
                    disabled={!employeeEligible}
                    onClick={() => openOrder(product)}
                  >
                    {employeeEligible
                      ? "Send this gift"
                      : "Location unavailable"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="no-market-results">
              <Search />
              <b>No available matches for these filters.</b>
              <p>Try another date, budget, or category.</p>
            </div>
          )}
          <section className="bundle-section">
            <div className="card-head">
              <div>
                <small>PERKJOY BUNDLES</small>
                <h2>A whole celebration, already planned.</h2>
                <p>One vendor, one approval, every thoughtful detail.</p>
              </div>
            </div>
            <div className="bundle-grid">
              {marketBundles.map((bundle) => (
                <article className="app-card" key={bundle.id}>
                  <span>
                    {bundle.category === "Team"
                      ? "🥳"
                      : bundle.category === "Achievement"
                        ? "🏆"
                        : "🎂"}
                  </span>
                  <small>{bundle.vendorName}</small>
                  <h3>{bundle.name}</h3>
                  <p>{bundle.description}</p>
                  <ul>
                    {bundle.items.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        <Check /> {item.quantity > 1 ? `${item.quantity} ` : ""}
                        {item.name}
                      </li>
                    ))}
                  </ul>
                  <footer>
                    <b>
                      {money(bundle.customerPriceCents)}
                      {bundle.customerPriceCents >= 14900 ? "+" : ""}
                    </b>
                    <button
                      className="button button-secondary"
                      disabled={!employeeEligible}
                      onClick={() => {
                        const product = data.products.find(
                          (item) =>
                            item.id ===
                            bundle.items.find((entry) => entry.productId)
                              ?.productId,
                        );
                        if (product) openOrder(product);
                      }}
                    >
                      Choose bundle
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
          <section className="concierge-banner">
            <div>
              <WandSparkles />
              <span>
                <small>PERKJOY CONCIERGE</small>
                <h2>
                  Tell us the occasion and budget. We&apos;ll handle the rest.
                </h2>
                <p>
                  PerkJoy uses employee preferences to plan a celebration, then
                  asks for your approval before anything is purchased.
                </p>
              </span>
            </div>
            <button
              className="button button-light"
              onClick={() => openConcierge(employeeId)}
            >
              Start a Concierge Request
            </button>
          </section>
        </>
      )}
      {data.localOrders.length > 0 && (
        <section className="app-card order-status">
          <div className="card-head">
            <div>
              <h2>Local gift orders</h2>
              <p>Availability, fulfillment, and delivery in one queue.</p>
            </div>
          </div>
          {data.localOrders.map((order) => (
            <div key={order.id}>
              <span className="activity-icon">
                <CakeSlice />
              </span>
              <p>
                <b>
                  {
                    data.products.find(
                      (product) => product.id === order.productId,
                    )?.name
                  }
                </b>
                <small>
                  For{" "}
                  {fullName(
                    data.employees.find(
                      (employee) => employee.id === order.employeeId,
                    ),
                  )}{" "}
                  · Delivery{" "}
                  {format(new Date(`${order.deliveryDate}T12:00:00`), "MMM d")}
                </small>
              </p>
              <em className="status-badge active">
                {order.status.replaceAll("_", " ")}
              </em>
              <b>{money(order.totalCents)}</b>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function MapPinSmall() {
  return <Store size={15} />;
}

function RulesView({
  data,
  mutate,
  openRule,
}: {
  data: Workspace;
  mutate: (payload: Record<string, unknown>) => void;
  openRule: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="AUTOMATION"
        title="Celebration rules"
        description="Set it once. PerkJoy keeps every moment on track."
        action={
          <button className="button button-primary" onClick={openRule}>
            <Plus /> Create rule
          </button>
        }
      />
      <div className="mode-banner">
        <div>
          <span>
            <Zap />
          </span>
          <div>
            <small>APPROVAL MODE</small>
            <b>Automatic with safeguards</b>
            <p>
              Each rule follows the spend guardrails configured for your
              organization.
            </p>
          </div>
        </div>
        <Link href="/team">Manage approvals</Link>
      </div>
      <section className="automation-template-section">
        <div className="card-head">
          <div>
            <small>STARTING POINTS</small>
            <h2>Automation templates</h2>
            <p>Choose a proven setup, then edit any rule below.</p>
          </div>
        </div>
        <div>
          {automationTemplates.map((template) => (
            <article
              className={
                data.organizationSettings.selectedTemplate === template.id
                  ? "selected"
                  : ""
              }
              key={template.id}
            >
              <span>
                {template.id === "local-celebration" ? (
                  <Store />
                ) : template.id === "milestone-company" ? (
                  <Award />
                ) : (
                  <CakeSlice />
                )}
              </span>
              <small>{template.bestFor}</small>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <footer>
                <em>
                  {template.rules.length} rule
                  {template.rules.length === 1 ? "" : "s"}
                </em>
                <button
                  className="button button-secondary"
                  onClick={() =>
                    mutate({
                      action: "applyAutomationTemplate",
                      templateId: template.id,
                    })
                  }
                >
                  {data.organizationSettings.selectedTemplate ===
                  template.id ? (
                    <>
                      <Check /> Active template
                    </>
                  ) : (
                    "Use template"
                  )}
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <section className="rules-grid">
        {data.rules.map((rule) => (
          <article className="app-card rule-card" key={rule.id}>
            <div>
              <span
                className={`rule-icon ${rule.active ? "active" : "paused"}`}
              >
                {rule.eventType === "Birthday" ? (
                  <CakeSlice />
                ) : rule.eventType.includes("Anniversary") ? (
                  <Award />
                ) : (
                  <Sparkles />
                )}
              </span>
              <button className="icon-button">
                <MoreHorizontal />
              </button>
            </div>
            <small>{rule.eventType.toUpperCase()}</small>
            <h3>{rule.name}</h3>
            <div className="rule-flow">
              <span>{rule.eventType}</span>
              <i>→</i>
              <span>
                {rule.rewardType} · {money(rule.amountCents)}
              </span>
            </div>
            <p>
              <CalendarDays /> {rule.timing}
            </p>
            <footer>
              <span
                className={`status-badge ${rule.active ? "active" : "paused"}`}
              >
                <i /> {rule.active ? "Active" : "Paused"}
              </span>
              <button
                className={`switch ${rule.active ? "on" : ""}`}
                onClick={() =>
                  mutate({ action: "toggleRule", ruleId: rule.id })
                }
                aria-label={`Toggle ${rule.name}`}
              >
                <i />
              </button>
            </footer>
          </article>
        ))}
      </section>
      <div className="empty-add-card">
        <span>
          <Plus />
        </span>
        <div>
          <b>Build another celebration rule</b>
          <p>
            Automate promotions, new-hire welcomes, custom milestones, and more.
          </p>
        </div>
        <button className="button button-secondary" onClick={openRule}>
          Create rule
        </button>
      </div>
    </>
  );
}

function ReportsView({ data }: { data: Workspace }) {
  const [range, setRange] = useState("90");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(range));
  const inRange = (value: string) =>
    range === "all" || new Date(value).getTime() >= cutoff.getTime();
  const rewards = data.rewards.filter((item) => inRange(item.createdAt));
  const orders = data.localOrders.filter((item) => inRange(item.createdAt));
  const events = data.events.filter(
    (item) => range === "all" || inRange(`${item.eventDate}T12:00:00`),
  );
  const handledEvents = events.filter((item) =>
    ["scheduled", "handled", "delivered"].includes(item.status),
  );
  const digital = rewards.reduce((sum, item) => sum + item.amountCents, 0);
  const local = orders.reduce((sum, item) => sum + item.totalCents, 0);
  const total = digital + local;
  const missed = events.filter(
    (item) =>
      item.status === "skipped" ||
      (item.status === "needs_attention" &&
        new Date(`${item.eventDate}T23:59:59`).getTime() < Date.now()),
  ).length;
  const employeesCelebrated = new Set([
    ...rewards.map((item) => item.employeeId),
    ...handledEvents.map((item) => item.employeeId),
  ]).size;
  const rewardReady = events.filter(
    (item) => !item.rewardSummary.toLowerCase().includes("no celebration"),
  ).length;
  const approvalReady = events.filter(
    (item) => item.status !== "approval_required",
  ).length;
  const deliveryReady = events.filter((item) => {
    const profile = data.profiles.find(
      (entry) => entry.employeeId === item.employeeId,
    );
    return (
      profile?.preferredDelivery === "digital_only" ||
      data.employeeLocations.some(
        (entry) => entry.employeeId === item.employeeId,
      )
    );
  }).length;
  const scheduleReady = handledEvents.length;
  const healthParts = [
    rewardReady,
    approvalReady,
    deliveryReady,
    scheduleReady,
  ];
  const health = events.length
    ? Math.round(
        healthParts.reduce(
          (sum, value) => sum + (value / events.length) * 25,
          0,
        ),
      )
    : 100;
  const healthLabel =
    health >= 90 ? "Excellent" : health >= 70 ? "Good" : "Needs Attention";
  const budget = data.organization.monthlyBudgetCents;
  const budgetUsed = Math.min(total, budget);
  const typeCounts = data.celebrationTypes
    .map((type) => ({
      label: type.name,
      value: events.filter(
        (event) =>
          event.celebrationTypeId === type.id &&
          ["scheduled", "handled", "delivered"].includes(event.status),
      ).length,
    }))
    .filter((item) => item.value > 0);
  const recognitionCount = rewards.length;
  const maxType = Math.max(
    1,
    ...typeCounts.map((item) => item.value),
    recognitionCount,
    orders.length,
  );
  const departments = [
    ...new Set(data.employees.map((employee) => employee.department)),
  ]
    .map((department) => {
      const employeeIds = data.employees
        .filter((employee) => employee.department === department)
        .map((employee) => employee.id);
      const celebrated = new Set([
        ...rewards
          .filter((item) => employeeIds.includes(item.employeeId))
          .map((item) => item.employeeId),
        ...handledEvents
          .filter((item) => employeeIds.includes(item.employeeId))
          .map((item) => item.employeeId),
      ]).size;
      return {
        department,
        people: employeeIds.length,
        celebrated,
        coverage: employeeIds.length
          ? Math.round((celebrated / employeeIds.length) * 100)
          : 0,
      };
    })
    .sort((a, b) => b.coverage - a.coverage);
  const statusCounts = [
    "Delivered",
    "Handled",
    "Scheduled",
    "Approval Required",
    "Needs Attention",
  ].map((label) => ({
    label,
    count: events.filter(
      (event) => event.status === label.toLowerCase().replaceAll(" ", "_"),
    ).length,
  }));
  return (
    <>
      <PageHeader
        eyebrow="CELEBRATION ANALYTICS"
        title="Are we taking care of our people?"
        description="Real operating signals—not points, rankings, or vanity activity."
        action={
          <select
            className="date-select"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
            <option value="all">All time</option>
          </select>
        }
      />
      <div className="report-kpis report-kpis-four">
        <article>
          <small>Moments Handled</small>
          <b>{handledEvents.length}</b>
          <em>
            {events.length
              ? Math.round((handledEvents.length / events.length) * 100)
              : 100}
            % of moments on track
          </em>
        </article>
        <article>
          <small>Employees Celebrated</small>
          <b>{employeesCelebrated}</b>
          <em>of {data.employees.length} employees</em>
        </article>
        <article>
          <small>Celebrations Missed</small>
          <b>{missed}</b>
          <em>{missed ? "Needs a follow-up" : "Nothing slipped through"}</em>
        </article>
        <article>
          <small>Average Celebration Spend</small>
          <b>
            {money(
              rewards.length + orders.length
                ? total / (rewards.length + orders.length)
                : 0,
            )}
          </b>
          <em>{rewards.length + orders.length} funded moments</em>
        </article>
      </div>
      <div className="phase-f-health-grid">
        <section className="app-card phase-f-health">
          <div
            className="health-report-ring"
            style={{ "--health": `${health * 3.6}deg` } as React.CSSProperties}
          >
            <span>
              <b>{health}%</b>
              <small>{healthLabel}</small>
            </span>
          </div>
          <div>
            <small>CELEBRATION HEALTH</small>
            <h2>{healthLabel}</h2>
            <p>
              A practical readiness score across rewards, approvals, delivery
              information, and scheduling.
            </p>
            <div className="health-signal-grid">
              {[
                ["Reward configured", rewardReady],
                ["Approval complete", approvalReady],
                ["Delivery ready", deliveryReady],
                ["Successfully scheduled", scheduleReady],
              ].map(([label, value]) => (
                <span key={String(label)}>
                  <i>
                    <b
                      style={{
                        width: `${events.length ? (Number(value) / events.length) * 100 : 100}%`,
                      }}
                    />
                  </i>
                  <small>{label}</small>
                  <em>
                    {value}/{events.length}
                  </em>
                </span>
              ))}
            </div>
          </div>
        </section>
        <section className="app-card phase-f-budget">
          <div className="card-head">
            <div>
              <h2>Budget pacing</h2>
              <p>Allocated budget is a planning limit, not a stored balance.</p>
            </div>
          </div>
          <strong>
            {money(Math.max(0, budget - budgetUsed))}
            <small> remaining</small>
          </strong>
          <div>
            <i
              style={{ width: `${budget ? (budgetUsed / budget) * 100 : 0}%` }}
            />
          </div>
          <p>
            <span>
              Allocated <b>{money(budget)}</b>
            </span>
            <span>
              Scheduled + spent <b>{money(total)}</b>
            </span>
            <span>
              Digital <b>{money(digital)}</b>
            </span>
            <span>
              Local <b>{money(local)}</b>
            </span>
          </p>
        </section>
      </div>
      <div className="phase-f-report-grid">
        <section className="app-card report-chart">
          <div className="card-head">
            <div>
              <h2>Moments handled by type</h2>
              <p>What your company is actually celebrating.</p>
            </div>
          </div>
          <div className="bar-chart">
            {[
              ...typeCounts.slice(0, 5),
              { label: "Manager recognition", value: recognitionCount },
              { label: "Local gifts", value: orders.length },
            ].map((item, index) => (
              <span key={item.label}>
                <small>{item.label}</small>
                <i>
                  <b
                    style={{
                      width: `${(item.value / maxType) * 100}%`,
                      background: [
                        "#f27a5f",
                        "#e6b94d",
                        "#548c78",
                        "#8166aa",
                        "#4f79a6",
                      ][index % 5],
                    }}
                  />
                </i>
                <em>{item.value}</em>
              </span>
            ))}
          </div>
        </section>
        <section className="app-card phase-f-status">
          <div className="card-head">
            <div>
              <h2>Moment outcomes</h2>
              <p>Every event has an obvious operational state.</p>
            </div>
          </div>
          {statusCounts.map((item) => (
            <span key={item.label}>
              <i className={item.label.toLowerCase().replaceAll(" ", "-")} />
              <b>{item.label}</b>
              <em>{item.count}</em>
            </span>
          ))}
        </section>
      </div>
      <section className="app-card phase-f-departments">
        <div className="card-head">
          <div>
            <h2>Celebration coverage by department</h2>
            <p>Spot teams that may be getting overlooked.</p>
          </div>
          <em>
            {data.employees.length
              ? Math.round((employeesCelebrated / data.employees.length) * 100)
              : 100}
            % company coverage
          </em>
        </div>
        <div>
          <span className="phase-f-department-head">
            <b>Department</b>
            <b>People</b>
            <b>Celebrated</b>
            <b>Coverage</b>
          </span>
          {departments.map((item) => (
            <span key={item.department}>
              <b>{item.department}</b>
              <em>{item.people}</em>
              <em>{item.celebrated}</em>
              <i>
                <small>
                  <b style={{ width: `${item.coverage}%` }} />
                </small>
                {item.coverage}%
              </i>
            </span>
          ))}
        </div>
      </section>
      <section className="phase-f-insight">
        <Sparkles />
        <div>
          <small>PERKJOY INSIGHT</small>
          <b>
            {health >= 90
              ? "Your celebration system is running smoothly."
              : approvalReady < events.length
                ? `${events.length - approvalReady} approval${events.length - approvalReady === 1 ? "" : "s"} are holding celebrations back.`
                : `${events.length - scheduleReady} moment${events.length - scheduleReady === 1 ? "" : "s"} still need a complete plan.`}
          </b>
          <p>
            Recognition frequency:{" "}
            {data.employees.length
              ? (rewards.length / data.employees.length).toFixed(1)
              : "0.0"}{" "}
            manager recognitions per employee in this period.
          </p>
        </div>
      </section>
    </>
  );
}

function PhaseETeamView({
  data,
  mutate,
  openTeam,
}: {
  data: Workspace;
  mutate: (payload: Record<string, unknown>) => void;
  openTeam: () => void;
}) {
  const pending = data.approvals.filter((item) => item.status === "pending");
  const conciergeActive = data.conciergeRequests.filter(
    (item) => !["delivered"].includes(item.status),
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="TEAM CELEBRATIONS"
        title="Celebrate the whole team"
        description="Plan group moments, review Concierge recommendations, and keep approval guardrails visible."
        action={
          <button className="button button-primary" onClick={openTeam}>
            <Plus /> Plan team celebration
          </button>
        }
      />
      <div className="report-kpis report-kpis-four phase-e-kpis">
        <article>
          <small>Team moments</small>
          <b>{data.teamCelebrations.length}</b>
          <em>Planned across departments</em>
        </article>
        <article>
          <small>Awaiting approval</small>
          <b>{pending.length}</b>
          <em>One-click decisions</em>
        </article>
        <article>
          <small>Concierge active</small>
          <b>{conciergeActive}</b>
          <em>Planned by PerkJoy</em>
        </article>
        <article>
          <small>Policies active</small>
          <b>{data.approvalPolicies.filter((item) => item.active).length}</b>
          <em>Automatic safeguards</em>
        </article>
      </div>
      <section className="app-card phase-e-section">
        <div className="card-head">
          <div>
            <small>GROUP MOMENTS</small>
            <h2>Team celebrations</h2>
            <p>One plan, every participant, and a single approval trail.</p>
          </div>
        </div>
        <div className="team-celebration-grid">
          {data.teamCelebrations.map((celebration) => {
            const approval = pending.find(
              (item) =>
                item.entityType === "team_celebration" &&
                item.entityId === celebration.id,
            );
            const people = celebration.participantEmployeeIds
              .map((id) =>
                data.employees.find((employee) => employee.id === id),
              )
              .filter(Boolean) as Employee[];
            return (
              <article key={celebration.id}>
                <header>
                  <span>
                    <Users />
                  </span>
                  <div>
                    <small>{celebration.eventType.toUpperCase()}</small>
                    <h3>{celebration.title}</h3>
                  </div>
                  <em className={`phase-e-status ${celebration.status}`}>
                    {celebration.status.replaceAll("_", " ")}
                  </em>
                </header>
                <p>
                  <CalendarDays />{" "}
                  {format(
                    new Date(`${celebration.eventDate}T12:00:00`),
                    "MMMM d, yyyy",
                  )}{" "}
                  {celebration.department ? `· ${celebration.department}` : ""}
                </p>
                <div className="participant-row">
                  <span>
                    {people.slice(0, 4).map((employee, index) => (
                      <i
                        className={`avatar ${index % 2 ? "avatar-green" : "avatar-coral"}`}
                        key={employee.id}
                      >
                        {initials(employee)}
                      </i>
                    ))}
                  </span>
                  <b>{people.length} people</b>
                  <em>
                    {celebration.rewardMode.replaceAll("_", " ")} ·{" "}
                    {money(celebration.budgetCents)}
                  </em>
                </div>
                {approval && (
                  <footer>
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        mutate({
                          action: "rejectRequest",
                          approvalId: approval.id,
                        })
                      }
                    >
                      Request changes
                    </button>
                    <button
                      className="button button-primary"
                      onClick={() =>
                        mutate({
                          action: "approveRequest",
                          approvalId: approval.id,
                        })
                      }
                    >
                      <Check /> Approve
                    </button>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="app-card phase-e-section">
        <div className="card-head">
          <div>
            <small>WHITE-GLOVE PLANNING</small>
            <h2>Concierge requests</h2>
            <p>Review the plan before PerkJoy coordinates anything.</p>
          </div>
        </div>
        <div className="concierge-request-list">
          {data.conciergeRequests.map((request) => {
            const employee = data.employees.find(
              (item) => item.id === request.employeeId,
            );
            const approval = pending.find(
              (item) =>
                item.entityType === "concierge_request" &&
                item.entityId === request.id,
            );
            let recommendation: {
              title?: string;
              summary?: string;
              amountCents?: number;
            } | null = null;
            try {
              recommendation = request.recommendation
                ? JSON.parse(request.recommendation)
                : null;
            } catch {
              recommendation = null;
            }
            return (
              <article key={request.id}>
                <div className="concierge-request-head">
                  <span className="avatar avatar-purple">
                    {employee ? initials(employee) : "?"}
                  </span>
                  <div>
                    <h3>
                      {request.occasion} for {fullName(employee)}
                    </h3>
                    <p>
                      {format(
                        new Date(`${request.deliveryDate}T12:00:00`),
                        "MMMM d",
                      )}{" "}
                      · Budget {money(request.budgetCents)}
                    </p>
                  </div>
                  <em className={`phase-e-status ${request.status}`}>
                    {request.status.replaceAll("_", " ")}
                  </em>
                </div>
                {recommendation ? (
                  <div className="concierge-plan">
                    <WandSparkles />
                    <span>
                      <small>CONCIERGE RECOMMENDS</small>
                      <b>{recommendation.title}</b>
                      <p>{recommendation.summary}</p>
                    </span>
                    <strong>
                      {money(recommendation.amountCents ?? request.budgetCents)}
                    </strong>
                  </div>
                ) : (
                  <div className="concierge-planning">
                    <Sparkles /> PerkJoy is reviewing preferences and planning
                    the details.
                  </div>
                )}
                {approval && (
                  <footer>
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        mutate({
                          action: "rejectRequest",
                          approvalId: approval.id,
                        })
                      }
                    >
                      Request changes
                    </button>
                    <button
                      className="button button-primary"
                      onClick={() =>
                        mutate({
                          action: "approveRequest",
                          approvalId: approval.id,
                        })
                      }
                    >
                      <Check /> Approve plan
                    </button>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="app-card phase-e-section">
        <div className="card-head">
          <div>
            <small>APPROVAL WORKFLOWS</small>
            <h2>Spend guardrails</h2>
            <p>Each celebration is routed by reward type and budget.</p>
          </div>
        </div>
        <div className="approval-policy-list">
          {data.approvalPolicies.map((policy) => (
            <article key={policy.id}>
              <span className={policy.active ? "active" : "paused"}>
                <ShieldCheck />
              </span>
              <div>
                <b>{policy.name}</b>
                <small>
                  {policy.rewardType === "any"
                    ? "All reward types"
                    : `${policy.rewardType} rewards`}{" "}
                  · {money(policy.minimumCents)}
                  {policy.maximumCents === null
                    ? "+"
                    : `–${money(policy.maximumCents)}`}
                </small>
              </div>
              <em>
                {policy.approvalLevel === "automatic"
                  ? "Auto-approved"
                  : `${policy.approvalLevel} approval`}
              </em>
              <button
                className={`switch ${policy.active ? "on" : ""}`}
                onClick={() =>
                  mutate({
                    action: "toggleApprovalPolicy",
                    policyId: policy.id,
                  })
                }
                aria-label={`Toggle ${policy.name}`}
              >
                <i />
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="app-card data-table team-table phase-e-access">
        <div className="card-head">
          <div>
            <small>ADMIN ACCESS</small>
            <h2>Your PerkJoy team</h2>
            <p>Company roles remain separate from celebration participants.</p>
          </div>
          <button className="button button-secondary">
            <Plus /> Invite teammate
          </button>
        </div>
        <div className="table-row table-head">
          <span>Team member</span>
          <span>Role</span>
          <span>Access</span>
          <span>Status</span>
          <span />
        </div>
        {[
          [
            "Taylor Morgan",
            "taylor@phillycreative.demo",
            "Owner",
            "Full organization",
          ],
          [
            "Jordan Lee",
            "jordan@phillycreative.demo",
            "Manager",
            "Design team",
          ],
          ["Priya Shah", "priya@phillycreative.demo", "Viewer", "Reports only"],
        ].map(([name, email, role, access], index) => (
          <div className="table-row" key={email}>
            <span className="employee-cell">
              <i
                className={`avatar ${index === 1 ? "avatar-green" : "avatar-coral"}`}
              >
                {name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </i>
              <p>
                <b>{name}</b>
                <small>{email}</small>
              </p>
            </span>
            <span>
              <b>{role}</b>
            </span>
            <span>{access}</span>
            <span>
              <em className="status-badge active">
                <i /> Active
              </em>
            </span>
            <span>
              <button className="icon-button">
                <MoreHorizontal />
              </button>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

function BillingView() {
  return (
    <>
      <PageHeader
        eyebrow="PLAN & BILLING"
        title="Billing"
        description="Manage your PerkJoy subscription and payment details."
      />
      <div className="billing-grid">
        <section className="app-card plan-card">
          <span>GROWTH PLAN</span>
          <h2>
            $79<small>/month</small>
          </h2>
          <p>For teams with up to 50 employees.</p>
          <div>
            <Check /> Automated celebrations
          </div>
          <div>
            <Check /> PerkJoy Local access
          </div>
          <div>
            <Check /> Reports and budget controls
          </div>
          <button className="button button-primary">Manage subscription</button>
        </section>
        <section className="app-card payment-card">
          <div className="card-head">
            <div>
              <h2>Payment method</h2>
              <p>Used for your SaaS subscription only.</p>
            </div>
          </div>
          <div className="credit-card-row">
            <span>
              <CreditCard />
            </span>
            <p>
              <b>Visa ending in 4242</b>
              <small>Expires 08/29</small>
            </p>
            <button>Edit</button>
          </div>
          <div className="billing-note">
            <ShieldCheck /> Reward purchases and your PerkJoy subscription are
            billed separately.
          </div>
        </section>
      </div>
    </>
  );
}

function SettingsView({
  data,
  mutate,
}: {
  data: Workspace;
  mutate: (payload: Record<string, unknown>) => void;
}) {
  const [section, setSection] = useState<"company" | "notifications">(
    "company",
  );
  const [budget, setBudget] = useState(
    String(data.organization.monthlyBudgetCents / 100),
  );
  const [reminderDays, setReminderDays] = useState<number[]>(
    data.organizationSettings.reminderDays,
  );
  const [preferences, setPreferences] = useState(
    data.organizationSettings.notificationPreferences,
  );
  const toggleDay = (day: number) =>
    setReminderDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => b - a),
    );
  return (
    <>
      <PageHeader
        eyebrow="ORGANIZATION"
        title="Settings"
        description="Configure how PerkJoy works for your company."
      />
      <div className="settings-layout">
        <aside>
          <button
            className={section === "company" ? "active" : ""}
            onClick={() => setSection("company")}
          >
            Company profile
          </button>
          <Link href="/rules">Automation</Link>
          <button
            className={section === "notifications" ? "active" : ""}
            onClick={() => setSection("notifications")}
          >
            Notifications
          </button>
          <Link href="/team">Approvals</Link>
        </aside>
        {section === "company" ? (
          <section className="app-card settings-card">
            <div>
              <h2>Company profile</h2>
              <p>Your company details and recognition preferences.</p>
            </div>
            <label>
              Company name
              <input defaultValue={data.organization.name} />
            </label>
            <div className="form-grid">
              <label>
                Timezone
                <select defaultValue={data.organization.timezone}>
                  <option>America/New_York</option>
                  <option>America/Chicago</option>
                  <option>America/Los_Angeles</option>
                </select>
              </label>
              <label>
                Celebration style
                <select
                  value={data.organizationSettings.celebrationStyle}
                  disabled
                >
                  <option value="digital">Digital rewards</option>
                  <option value="local">Local gifts</option>
                  <option value="both">Digital + local</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Monthly recognition budget
                <div className="money-input">
                  <span>$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                  />
                </div>
              </label>
              <label>
                Leap-day birthday handling
                <select>
                  <option>February 28</option>
                  <option>March 1</option>
                </select>
              </label>
            </div>
            <div className="settings-onboarding-note">
              <Sparkles />
              <span>
                <b>
                  {data.organizationSettings.onboardingCompleted
                    ? "Guided setup completed"
                    : "Finish guided setup"}
                </b>
                <p>
                  Review celebration types, budget, and your automation starting
                  point.
                </p>
              </span>
              <Link className="button button-secondary" href="/onboarding">
                Open setup
              </Link>
            </div>
            <div className="settings-actions">
              <button
                className="button button-primary"
                onClick={() =>
                  mutate({
                    action: "saveBudget",
                    monthlyBudgetCents: Number(budget) * 100,
                  })
                }
              >
                Save changes
              </button>
            </div>
          </section>
        ) : (
          <section className="app-card settings-card notification-settings">
            <div>
              <h2>Event reminders</h2>
              <p>
                Get the right heads-up without repeating alerts for moments
                PerkJoy already has handled.
              </p>
            </div>
            <fieldset>
              <legend>Remind admins before an unhandled event</legend>
              <div className="reminder-day-picker">
                {[30, 14, 7, 3, 1].map((day) => (
                  <button
                    type="button"
                    className={reminderDays.includes(day) ? "active" : ""}
                    onClick={() => toggleDay(day)}
                    key={day}
                  >
                    <Check /> {day} day{day === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
              <small>
                Fully automated events show “PerkJoy has this handled” instead
                of sending repeated action requests.
              </small>
            </fieldset>
            <fieldset>
              <legend>Notification types</legend>
              <div className="notification-toggle-list">
                {[
                  [
                    "eventReminders",
                    "Event reminders",
                    "Upcoming moments that still need a plan",
                  ],
                  [
                    "budgetAlerts",
                    "Budget alerts",
                    "When scheduled celebrations approach the monthly budget",
                  ],
                  [
                    "rewardFailures",
                    "Reward failures",
                    "Digital rewards that could not be delivered",
                  ],
                  [
                    "deliveryUpdates",
                    "Delivery updates",
                    "Local order confirmations and issues",
                  ],
                ].map(([key, label, description]) => (
                  <label key={key}>
                    <span>
                      <b>{label}</b>
                      <small>{description}</small>
                    </span>
                    <button
                      type="button"
                      className={`switch ${preferences[key as keyof typeof preferences] ? "on" : ""}`}
                      onClick={() =>
                        setPreferences((current) => ({
                          ...current,
                          [key]: !current[key as keyof typeof current],
                        }))
                      }
                      aria-label={`Toggle ${label}`}
                    >
                      <i />
                    </button>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="settings-actions">
              <button
                className="button button-primary"
                disabled={!reminderDays.length}
                onClick={() =>
                  mutate({
                    action: "saveReminderSettings",
                    reminderDays,
                    notificationPreferences: preferences,
                  })
                }
              >
                Save reminders
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function ModalShell({
  title,
  description,
  close,
  children,
}: {
  title: string;
  description: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button onClick={close} aria-label="Close">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function AddEmployeeModal({
  busy,
  close,
  submit,
}: {
  busy: boolean;
  close: () => void;
  submit: (payload: Record<string, unknown>) => void;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit({
      action: "addEmployee",
      ...Object.fromEntries(form.entries()),
      birthdayMonth: Number(form.get("birthdayMonth")),
      birthdayDay: Number(form.get("birthdayDay")),
    });
  }
  return (
    <ModalShell
      title="Add an employee"
      description="We'll start watching for their important moments."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            First name
            <input required name="firstName" autoFocus />
          </label>
          <label>
            Last name
            <input required name="lastName" />
          </label>
        </div>
        <label>
          Work email
          <input required type="email" name="email" />
        </label>
        <div className="form-grid">
          <label>
            Department
            <input required name="department" placeholder="e.g. Design" />
          </label>
          <label>
            Job title
            <input required name="jobTitle" />
          </label>
        </div>
        <div className="form-grid three">
          <label>
            Birthday month
            <select name="birthdayMonth" defaultValue="8">
              {Array.from({ length: 12 }, (_, i) => (
                <option value={i + 1} key={i}>
                  {format(new Date(2020, i, 1), "MMMM")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Day
            <input
              name="birthdayDay"
              type="number"
              min="1"
              max="31"
              defaultValue="15"
            />
          </label>
          <label>
            Hire date
            <input
              required
              name="hireDate"
              type="date"
              defaultValue={format(new Date(), "yyyy-MM-dd")}
            />
          </label>
        </div>
        <p className="privacy-note">
          <ShieldCheck /> Birth year is never required. Birthday data stays
          private to your organization.
        </p>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Adding…" : "Add employee"}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function RecognitionModal({
  employees,
  selected,
  setSelected,
  busy,
  close,
  submit,
}: {
  employees: Employee[];
  selected: string;
  setSelected: (id: string) => void;
  busy: boolean;
  close: () => void;
  submit: (payload: Record<string, unknown>) => void;
}) {
  const [amount, setAmount] = useState(5000);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit({
      action: "recognize",
      employeeId: selected,
      recognitionType: form.get("recognitionType"),
      message: form.get("message"),
      amountCents: amount,
    });
  }
  return (
    <ModalShell
      title="Celebrate Someone"
      description="Employee, reason, reward, message—done in under 30 seconds."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <label>
          1. Employee
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
        </label>
        <label>
          2. Reason
          <select name="recognitionType">
            <option>Great Work</option>
            <option>Above & Beyond</option>
            <option>Customer Praise</option>
            <option>Sales Goal</option>
            <option>Project Complete</option>
            <option>Team Player</option>
            <option>Promotion</option>
            <option>Get well soon</option>
            <option>Custom</option>
          </select>
        </label>
        <fieldset>
          <legend>3. Reward</legend>
          <div className="amount-picker">
            {[0, 1000, 2500, 5000, 7500, 10000].map((value) => (
              <button
                type="button"
                className={amount === value ? "active" : ""}
                onClick={() => setAmount(value)}
                key={value}
              >
                {value === 0 ? "Recognition only" : money(value)}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          4. Message
          <textarea
            name="message"
            required
            defaultValue="Your work made a real difference. Thank you for going above and beyond!"
            rows={3}
          />
        </label>
        <div className="confirmation-strip">
          <Gift />
          <span>
            <b>
              {amount
                ? `${money(amount)} digital reward`
                : "Recognition message"}
            </b>
            <small>
              {amount
                ? "Scheduled through your connected reward provider"
                : "No reward purchase"}
            </small>
          </span>
        </div>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Sending…" : "5. Send Celebration"}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function QuickCelebrateModal({
  data,
  selected,
  setSelected,
  busy,
  close,
  submit,
}: {
  data: Workspace;
  selected: string;
  setSelected: (id: string) => void;
  busy: boolean;
  close: () => void;
  submit: (
    payload: Record<string, unknown>,
  ) => Promise<(Workspace & { profileInviteUrl?: string }) | undefined>;
}) {
  const recommendation =
    data.recommendations.find(
      (item) => item.employeeId === selected && item.status === "recommended",
    ) ?? data.recommendations.find((item) => item.employeeId === selected);
  const [amountOverride, setAmountOverride] = useState<number | null>(null);
  const amount = amountOverride ?? recommendation?.amountCents ?? 2500;
  const history = data.giftHistory
    .filter((gift) => gift.employeeId === selected)
    .slice(0, 3);
  const approvalOnly =
    recommendation &&
    ["local", "experience", "surprise me"].includes(
      recommendation.rewardType.toLowerCase(),
    ) &&
    recommendation.status !== "approved";
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (approvalOnly)
      submit({
        action: "approveRecommendation",
        recommendationId: recommendation.id,
      });
    else
      submit({
        action: "quickCelebrate",
        employeeId: selected,
        recommendationId: recommendation?.id,
        recognitionType: "Quick Celebrate",
        message: "You made a real difference. This celebration is for you!",
        amountCents: amount,
      });
  }
  async function generate(surpriseMe: boolean) {
    const budgetCents = amount || 5000;
    setAmountOverride(null);
    await submit({
      action: "generateRecommendation",
      employeeId: selected,
      budgetCents,
      surpriseMe,
    });
  }
  return (
    <ModalShell
      title="Quick Celebrate"
      description="A personalized celebration in under 30 seconds."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <label>
          Employee
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setAmountOverride(null);
            }}
          >
            {data.employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
        </label>
        <div className="recommendation-actions">
          <button type="button" onClick={() => generate(false)}>
            <WandSparkles /> Smart Pick
          </button>
          <button type="button" onClick={() => generate(true)}>
            <Gift /> Surprise Me
          </button>
        </div>
        <section className="quick-recommendation">
          <span>
            <WandSparkles />
          </span>
          <div>
            <small>
              {recommendation?.rewardType?.toUpperCase() ??
                "PERKJOY RECOMMENDS"}{" "}
              · {recommendation?.recommendationScore ?? 76}% MATCH
            </small>
            <h3>
              {recommendation?.title ??
                `${money(amount)} employee-choice reward`}
            </h3>
            <p>
              {recommendation?.recommendationReason ??
                "Choose Smart Pick and PerkJoy will use this employee's private profile, work mode, budget, and gift history."}
            </p>
            {recommendation?.somethingDifferent && (
              <em>Something different this year</em>
            )}
          </div>
          <b>{money(amount)}</b>
        </section>
        {history.length > 0 && (
          <section className="gift-history-mini">
            <div>
              <b>Celebration History</b>
              <small>PerkJoy avoids repeating these gifts.</small>
            </div>
            {history.map((gift) => (
              <span key={gift.id}>
                <Gift />
                <p>
                  <b>{gift.title}</b>
                  <small>
                    {gift.occasion} ·{" "}
                    {format(new Date(gift.createdAt), "MMM yyyy")}
                  </small>
                </p>
                <em>{gift.status}</em>
              </span>
            ))}
          </section>
        )}
        <fieldset>
          <legend>Change budget</legend>
          <div className="amount-picker">
            {[0, 2500, 5000, 7500, 10000].map((value) => (
              <button
                type="button"
                className={amount === value ? "active" : ""}
                onClick={() => setAmountOverride(value)}
                key={value}
              >
                {value === 0 ? "Recognition only" : money(value)}
              </button>
            ))}
          </div>
        </fieldset>
        {!approvalOnly && (
          <label>
            Message
            <textarea
              name="message"
              rows={3}
              defaultValue="You made a real difference. This celebration is for you!"
            />
          </label>
        )}
        <p className="privacy-note">
          <ShieldCheck /> Private preferences inform the recommendation but are
          never included in the employee message.
        </p>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy
              ? "Working…"
              : approvalOnly
                ? "Approve recommendation"
                : amount
                  ? `Send ${money(amount)} reward`
                  : "Send recognition"}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function ConciergeModal({
  employees,
  selected,
  setSelected,
  busy,
  close,
  submit,
}: {
  employees: Employee[];
  selected: string;
  setSelected: (id: string) => void;
  busy: boolean;
  close: () => void;
  submit: (payload: Record<string, unknown>) => void;
}) {
  const [budget, setBudget] = useState(100);
  const deliveryDate = format(
    new Date(Date.now() + 7 * 86400000),
    "yyyy-MM-dd",
  );
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit({
      action: "createConcierge",
      employeeId: selected,
      occasion: form.get("occasion"),
      budgetCents: budget * 100,
      deliveryDate: form.get("deliveryDate"),
    });
  }
  return (
    <ModalShell
      title="PerkJoy Concierge"
      description="Tell us the occasion and budget. We'll handle the rest."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <label>
          Employee
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Occasion
            <select name="occasion">
              <option>Birthday</option>
              <option>Work Anniversary</option>
              <option>Team Achievement</option>
              <option>New Hire</option>
              <option>Get well soon</option>
              <option>Custom Celebration</option>
            </select>
          </label>
          <label>
            Delivery date
            <input
              name="deliveryDate"
              type="date"
              min={deliveryDate}
              defaultValue={deliveryDate}
            />
          </label>
        </div>
        <label>
          Celebration budget
          <div className="money-input">
            <span>$</span>
            <input
              type="number"
              min="25"
              max="2500"
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
          </div>
        </label>
        <section className="concierge-process">
          <span>
            <b>1</b> Preferences reviewed
          </span>
          <span>
            <b>2</b> Celebration planned
          </span>
          <span>
            <b>3</b> You approve
          </span>
          <span>
            <b>4</b> PerkJoy coordinates delivery
          </span>
        </section>
        <p className="privacy-note">
          <ShieldCheck /> Nothing is purchased until an authorized company admin
          approves the recommendation.
        </p>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Submitting…" : "Send to Concierge"}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function RuleModal({
  celebrationTypes,
  busy,
  close,
  submit,
}: {
  celebrationTypes: Workspace["celebrationTypes"];
  busy: boolean;
  close: () => void;
  submit: (payload: Record<string, unknown>) => void;
}) {
  const [amount, setAmount] = useState(25);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit({
      action: "createRule",
      name: form.get("name"),
      eventType: form.get("eventType"),
      rewardType: form.get("rewardType"),
      amountCents: amount * 100,
      timing: form.get("timing"),
      approvalRequired: form.get("approvalRequired") === "on",
    });
  }
  return (
    <ModalShell
      title="Create an automation rule"
      description="Tell PerkJoy which moment to remember and how to handle it."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <label>
          Rule name
          <input
            name="name"
            required
            autoFocus
            placeholder="Promotion celebration"
          />
        </label>
        <div className="form-grid">
          <label>
            Celebration type
            <select name="eventType">
              {celebrationTypes
                .filter((type) => type.active)
                .map((type) => (
                  <option key={type.id}>{type.name}</option>
                ))}
            </select>
          </label>
          <label>
            Reward
            <select name="rewardType">
              <option>Digital Reward</option>
              <option>Personalized Reward</option>
              <option>Local Gift</option>
              <option>Recognition Only</option>
              <option>Surprise Me</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Maximum amount
            <div className="money-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                max="2500"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </div>
          </label>
          <label>
            Timing
            <select name="timing">
              <option>30 days before</option>
              <option>14 days before</option>
              <option>7 days before</option>
              <option>3 days before</option>
              <option>1 day before</option>
              <option>On the day</option>
            </select>
          </label>
        </div>
        <label className="modal-check-row">
          <input type="checkbox" name="approvalRequired" /> Require approval
          before anything is purchased
        </label>
        <p className="privacy-note">
          <ShieldCheck /> This creates an editable rule. Existing employee
          moments are never duplicated.
        </p>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Creating…" : "Create rule"}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function TeamCelebrationModal({
  employees,
  busy,
  close,
  submit,
}: {
  employees: Employee[];
  busy: boolean;
  close: () => void;
  submit: (payload: Record<string, unknown>) => void;
}) {
  const [participants, setParticipants] = useState<string[]>(
    employees.slice(0, 3).map((employee) => employee.id),
  );
  const [budget, setBudget] = useState(150);
  const defaultDate = format(
    new Date(Date.now() + 10 * 86400000),
    "yyyy-MM-dd",
  );
  function toggleParticipant(id: string) {
    setParticipants((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit({
      action: "createTeamCelebration",
      title: form.get("title"),
      eventType: form.get("eventType"),
      eventDate: form.get("eventDate"),
      department: form.get("department"),
      rewardMode: form.get("rewardMode"),
      budgetCents: budget * 100,
      participantIds: participants,
    });
  }
  return (
    <ModalShell
      title="Plan a team celebration"
      description="Bring several people into one coordinated moment."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <label>
          Celebration title
          <input
            name="title"
            required
            autoFocus
            placeholder="Product launch celebration"
          />
        </label>
        <div className="form-grid">
          <label>
            Moment type
            <select name="eventType">
              <option>Team Achievement</option>
              <option>Project Launch</option>
              <option>Department Milestone</option>
              <option>Company Moment</option>
            </select>
          </label>
          <label>
            Celebration date
            <input
              name="eventDate"
              type="date"
              min={format(new Date(), "yyyy-MM-dd")}
              defaultValue={defaultDate}
              required
            />
          </label>
        </div>
        <label>
          Department
          <input name="department" placeholder="Optional" />
        </label>
        <fieldset className="team-participant-picker">
          <legend>
            Participants <small>Choose at least two</small>
          </legend>
          <div>
            {employees.map((employee) => (
              <label key={employee.id}>
                <input
                  type="checkbox"
                  checked={participants.includes(employee.id)}
                  onChange={() => toggleParticipant(employee.id)}
                />
                <span className="avatar avatar-coral">
                  {initials(employee)}
                </span>
                <b>{fullName(employee)}</b>
                <small>{employee.department}</small>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid">
          <label>
            Celebration format
            <select name="rewardMode">
              <option value="team_experience">Shared team experience</option>
              <option value="individual">Individual rewards</option>
            </select>
          </label>
          <label>
            Total budget
            <div className="money-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                max="2500"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
            </div>
          </label>
        </div>
        <p className="privacy-note">
          <ShieldCheck /> Your active approval policies will automatically route
          this plan to the right reviewer.
        </p>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={busy || participants.length < 2}
          >
            {busy ? "Planning…" : `Plan for ${participants.length} people`}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function OrderModal({
  employees,
  product,
  selected,
  setSelected,
  close,
}: {
  employees: Employee[];
  product: Product;
  selected: string;
  setSelected: (id: string) => void;
  close: () => void;
}) {
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const tomorrow = format(new Date(Date.now() + 86400000 * 3), "yyyy-MM-dd");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutBusy(true);
    setCheckoutError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await authenticatedFetch("/api/stripe/local/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selected, productId: product.id, deliveryDate: form.get("deliveryDate"), giftMessage: form.get("giftMessage") }),
      });
      const result = await response.json() as { url?: string | null; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to open secure checkout.");
      window.location.assign(result.url);
    } catch (reason) {
      setCheckoutError(reason instanceof Error ? reason.message : "Unable to open secure checkout.");
      setCheckoutBusy(false);
    }
  }
  return (
    <ModalShell
      title="Send a local gift"
      description="PerkJoy will confirm availability and coordinate delivery."
      close={close}
    >
      <form onSubmit={onSubmit}>
        <div className="selected-product">
          <span>🎂</span>
          <div>
            <small>{product.vendorName}</small>
            <b>{product.name}</b>
            <p>Serves {product.servesPeople}</p>
          </div>
          <b>{money(product.priceCents)}</b>
        </div>
        <label>
          Employee
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Delivery date
          <input
            required
            name="deliveryDate"
            type="date"
            min={tomorrow}
            defaultValue={tomorrow}
          />
        </label>
        <label>
          Gift message
          <textarea
            name="giftMessage"
            rows={3}
            defaultValue="Hope your day is as wonderful as you are. Happy Birthday!"
          />
        </label>
        <div className="order-total">
          <span>
            Product <b>{money(product.priceCents)}</b>
          </span>
          <span>
            Delivery <b>{money(product.deliveryFeeCents)}</b>
          </span>
          <hr />
          <span>
            Total <b>{money(product.priceCents + product.deliveryFeeCents)}</b>
          </span>
        </div>
        <p className="privacy-note">
          <ShieldCheck /> Secure payment is handled by Stripe. The local vendor receives their payout automatically after payment.
        </p>
        {checkoutError && <div className="app-error"><span>{checkoutError}</span></div>}
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={checkoutBusy}>
            {checkoutBusy
              ? "Placing order…"
              : `Pay ${money(product.priceCents + product.deliveryFeeCents)}`}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function AppSkeleton() {
  return (
    <div className="app-page">
      <aside className="app-sidebar">
        <div className="sidebar-head">
          <Logo />
        </div>
      </aside>
      <section className="app-workspace">
        <header className="app-topbar" />
        <main className="app-content">
          <div className="skeleton title-skeleton" />
          <div className="kpi-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="skeleton kpi-skeleton" key={i} />
            ))}
          </div>
          <div className="skeleton table-skeleton" />
        </main>
      </section>
    </div>
  );
}
