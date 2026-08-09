"use client";
/* eslint-disable jsx-a11y/no-autofocus */
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function ResetPasswordForm() {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); if (password.length < 8) return setMessage("Use at least 8 characters."); if (!isSupabaseConfigured()) return setMessage("Supabase is not connected in this preview."); setBusy(true); const client = createBrowserSupabaseClient(); const { error } = await client.auth.updateUser({ password }); setMessage(error ? error.message : "Password updated. You can log in now."); setBusy(false); }
  return <main className="auth-page"><section className="auth-brand"><Link href="/"><Logo inverse /></Link><div><span><ShieldCheck /> Secure account recovery</span><h1>Choose a new password.</h1><p>Your reset link is single-use and your password is handled directly by Supabase Auth.</p></div><small><ShieldCheck /> PerkJoy never stores your password</small></section><section className="auth-form-wrap"><div className="auth-form-card"><small>RESET PASSWORD</small><h2>Create a new password</h2><p>Use at least 8 characters.</p><form onSubmit={submit}><label>New password<input name="password" type="password" minLength={8} required autoFocus /></label>{message && <div className="auth-message">{message}</div>}<button className="button button-primary" disabled={busy}>{busy ? "Updating…" : "Update password"}<ArrowRight /></button></form><footer><Link href="/login">Back to login</Link></footer></div></section></main>;
}
