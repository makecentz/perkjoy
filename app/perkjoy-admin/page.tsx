import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
export const metadata: Metadata = { title: "Admin Console" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const requestHeaders = await headers();
  const signedIn = Boolean(requestHeaders.get("oai-authenticated-user-id"));
  return <main className="admin-gate"><nav><Logo /><Link href="/"><ArrowLeft /> Back to PerkJoy</Link></nav><section><span><LockKeyhole /></span><small>PERKJOY INTERNAL</small><h1>Super-admin console</h1><p>{signedIn ? "Your identity is verified, but this account has not been granted the server-managed SUPER_ADMIN role." : "Sign in with an authorized PerkJoy operations account to manage organizations, rewards, vendors, and local deliveries."}</p><div><ShieldCheck /><span><b>Server-enforced access</b><small>Super-admin status is never read from client-controlled user metadata.</small></span></div><a className="button button-primary" href="/signin-with-chatgpt?return_to=/perkjoy-admin">{signedIn ? "Switch account" : "Sign in securely"}</a><small className="admin-note"><Sparkles /> The operations queue activates after a SUPER_ADMIN is provisioned in the database.</small></section></main>;
}
