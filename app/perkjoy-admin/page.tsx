import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, BarChart3, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Admin Console" };
export const dynamic = "force-dynamic";

const businessMetrics = [
  ["MRR", "$—"], ["Active Organizations", "—"], ["Trial Organizations", "—"], ["Employees Managed", "—"],
  ["Moments Handled", "—"], ["Digital Reward Volume", "$—"], ["Local Marketplace GMV", "$—"],
  ["Marketplace Revenue", "$—"], ["Average Order Value", "$—"], ["Gross Marketplace Margin", "—%"],
  ["Concierge Revenue", "$—"], ["Orders This Week", "—"], ["Failed Orders", "—"], ["Vendor Performance", "—"],
];

export default async function Page() {
  const requestHeaders = await headers();
  const signedIn = Boolean(requestHeaders.get("oai-authenticated-user-id"));
  return <main className="admin-gate"><nav><Logo /><Link href="/"><ArrowLeft /> Back to PerkJoy</Link></nav><section><span><LockKeyhole /></span><small>PERKJOY INTERNAL</small><h1>Super-admin console</h1><p>{signedIn ? "Your identity is verified, but this account has not been granted the server-managed SUPER_ADMIN role." : "Sign in with an authorized PerkJoy operations account to manage organizations, rewards, vendors, local deliveries, and Concierge."}</p><div><ShieldCheck /><span><b>Server-enforced access</b><small>Super-admin status is never read from client-controlled user metadata.</small></span></div><a className="button button-primary" href="/signin-with-chatgpt?return_to=/perkjoy-admin">{signedIn ? "Switch account" : "Sign in securely"}</a><small className="admin-note"><Sparkles /> The operations queue activates after a SUPER_ADMIN is provisioned in the database.</small></section><div className="admin-metric-preview"><header><div><BarChart3 /><span><small>BUSINESS HEALTH</small><h2>PerkJoy operations metrics</h2></span></div><em><LockKeyhole /> SUPER_ADMIN only</em></header><div>{businessMetrics.map(([label, value]) => <article key={label}><small>{label}</small><b>{value}</b></article>)}</div><p><ShieldCheck /> Marketplace cost, margin, private preferences, and cross-organization data remain hidden until server-side authorization succeeds.</p></div></main>;
}
