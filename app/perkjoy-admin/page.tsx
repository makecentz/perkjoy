import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BarChart3, Building2, CheckCircle2, Gift, LockKeyhole, ShieldCheck, Sparkles, Store, Users, WandSparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getAdminAnalytics } from "@/lib/admin-analytics";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "PerkJoy Operations" };
export const dynamic = "force-dynamic";

function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? await supabase.from("profiles").select("is_super_admin").eq("id", user.id).single()
    : null;
  const authorized = Boolean(user && profile?.data?.is_super_admin);
  if (!authorized) return <AdminGate identified={Boolean(user)} />;

  const analytics = await getAdminAnalytics();
  const { metrics, queue, vendorPerformance } = analytics;
  const cards = [
    ["MRR", money(metrics.mrrCents), "Subscription revenue", BarChart3],
    ["Active Organizations", metrics.activeOrganizations, `${metrics.trialOrganizations} trials`, Building2],
    ["Employees Managed", metrics.employeesManaged, `${metrics.organizations} organizations`, Users],
    ["Moments Handled", metrics.momentsHandled, "Scheduled or delivered", CheckCircle2],
    ["Digital Reward Volume", money(metrics.digitalRewardVolumeCents), "Reward value, not revenue", Gift],
    ["Local Marketplace GMV", money(metrics.localGmvCents), `${money(metrics.averageOrderValueCents)} average order`, Store],
    ["Marketplace Revenue", money(metrics.marketplaceRevenueCents), `${metrics.grossMarginPercent}% gross margin`, BarChart3],
    ["Concierge Revenue", money(metrics.conciergeRevenueCents), "Approved service fees", WandSparkles],
  ] as const;
  return <main className="admin-console"><nav><Logo /><div><em><ShieldCheck /> SUPER ADMIN</em><Link href="/dashboard"><ArrowLeft /> Company workspace</Link></div></nav><header><div><small>PERKJOY OPERATIONS</small><h1>Business health, without guesswork.</h1><p>Revenue, fulfillment, and celebration outcomes across every organization.</p></div><span><i /> Live operating view</span></header><section className="admin-business-metrics">{cards.map(([label,value,note,Icon]) => <article key={label}><span><Icon /></span><small>{label}</small><b>{value}</b><em>{note}</em></article>)}</section><div className="admin-operations-grid"><section className="admin-panel"><div className="admin-panel-head"><div><small>NEEDS ATTENTION</small><h2>Operations queue</h2><p>The work that could hold up a celebration.</p></div><AlertTriangle /></div><div className="admin-queue"><article><span className="admin-queue-coral"><ShieldCheck /></span><p><b>Reward approvals</b><small>Company decisions waiting</small></p><strong>{queue.approvals}</strong></article><article><span className="admin-queue-gold"><WandSparkles /></span><p><b>Concierge requests</b><small>Planning or approval in progress</small></p><strong>{queue.concierge}</strong></article><article><span className="admin-queue-green"><Store /></span><p><b>Local fulfillment</b><small>Orders not yet completed</small></p><strong>{queue.localOrders}</strong></article><article><span className="admin-queue-coral"><AlertTriangle /></span><p><b>Failed orders</b><small>Issues requiring intervention</small></p><strong>{metrics.failedOrders}</strong></article></div></section><section className="admin-panel"><div className="admin-panel-head"><div><small>THIS WEEK</small><h2>Marketplace pulse</h2><p>Volume, revenue, and delivery performance.</p></div><Store /></div><div className="admin-market-pulse"><article><b>{metrics.ordersThisWeek}</b><small>Orders this week</small></article><article><b>{money(metrics.averageOrderValueCents)}</b><small>Average order value</small></article><article><b>{metrics.grossMarginPercent}%</b><small>Gross marketplace margin</small></article></div></section></div><section className="admin-panel admin-vendor-table"><div className="admin-panel-head"><div><small>VENDOR PERFORMANCE</small><h2>Local partners</h2><p>Customer value and reliable fulfillment in one view.</p></div><Sparkles /></div><div><span className="admin-vendor-head"><b>Vendor</b><b>Orders</b><b>GMV</b><b>Rating</b><b>Success</b></span>{vendorPerformance.map((vendor) => <span key={vendor.vendorName}><b>{vendor.vendorName}</b><em>{vendor.orders}</em><em>{money(vendor.gmvCents)}</em><em>{vendor.rating?.toFixed(1) ?? "New"}</em><i><small><b style={{ width: `${vendor.successRate}%` }} /></small>{vendor.successRate}%</i></span>)}</div></section><footer><ShieldCheck /> Marketplace cost, margin, and cross-organization data are only calculated after server-side Super Admin authorization.</footer></main>;
}

function AdminGate({ identified }: { identified: boolean }) {
  const preview = ["MRR","Active Organizations","Employees Managed","Moments Handled","Digital Reward Volume","Local Marketplace GMV","Marketplace Revenue","Concierge Revenue"];
  return <main className="admin-gate"><nav><Logo /><Link href="/"><ArrowLeft /> Back to PerkJoy</Link></nav><section><span><LockKeyhole /></span><small>PERKJOY INTERNAL</small><h1>Super Admin access only</h1><p>{identified ? "This identity has not been provisioned for PerkJoy operations." : "Use a server-provisioned operations identity to view cross-company business metrics."}</p><div><ShieldCheck /><span><b>Server-enforced access</b><small>Super Admin status is never read from client-controlled profile data.</small></span></div><Link className="button button-primary" href="/dashboard">Return to workspace</Link><small className="admin-note"><Sparkles /> Ask a PerkJoy operator to add your server identity to the Super Admin allowlist.</small></section><div className="admin-metric-preview"><header><div><BarChart3 /><span><small>BUSINESS HEALTH</small><h2>PerkJoy operations metrics</h2></span></div><em><LockKeyhole /> RESTRICTED</em></header><div>{preview.map((label) => <article key={label}><small>{label}</small><b>—</b></article>)}</div><p><ShieldCheck /> Internal marketplace economics remain hidden until authorization succeeds.</p></div></main>;
}
