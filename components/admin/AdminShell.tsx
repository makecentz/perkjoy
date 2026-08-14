import Link from "next/link";
import { ArrowLeft, BarChart3, CircleDollarSign, LayoutDashboard, Settings, ShieldCheck, Store } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AdminShell({ section, children }: { section: string; children: React.ReactNode }) {
  return <main className="admin-shell"><aside className="admin-sidebar"><div className="sidebar-head"><Link href="/"><Logo /></Link></div><div className="admin-identity"><ShieldCheck /><span><b>PerkJoy Admin</b><small>Internal operations</small></span></div><nav><small>ADMIN</small><Link className={section === "overview" ? "active" : ""} href="/perkjoy-admin"><LayoutDashboard />Overview</Link><Link href="/perkjoy-admin#operations"><BarChart3 />Operations</Link><Link href="/perkjoy-admin#vendors"><Store />Vendors</Link><Link className={section === "payouts" ? "active" : ""} href="/perkjoy-admin?section=payouts"><CircleDollarSign />Payouts</Link><Link className={section === "settings" ? "active" : ""} href="/perkjoy-admin?section=settings"><Settings />Settings</Link></nav><Link className="admin-back" href="/dashboard"><ArrowLeft />Company dashboard</Link></aside><section className="admin-shell-content">{children}</section></main>;
}
