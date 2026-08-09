"use client";
/* eslint-disable jsx-a11y/no-autofocus */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, Check, Gift, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (!configured) {
      setMessage("Supabase is not connected in this preview. Use the demo workspace below.");
      setBusy(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : mode === "forgot"
        ? await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/reset-password`,
        })
        : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: form.get("firstName"),
              last_name: form.get("lastName"),
              company_name: form.get("companyName"),
            },
          },
        });

    if (result.error) setMessage(result.error.message);
    else if (mode === "forgot") setMessage("Check your email for a secure reset link.");
    else if (mode === "signup") setMessage("Account created. Add your company credit card to activate your workspace.");
    else location.href = "/dashboard";
    setBusy(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <Link href="/"><Logo inverse /></Link>
        <div>
          <span><Sparkles /> Employee appreciation on autopilot</span>
          <h1>{mode === "login" ? "Welcome back to the joyful part of work." : "Build a culture that remembers the moments that matter."}</h1>
          <p>Birthdays, anniversaries, and everyday wins—thoughtfully celebrated without the admin scramble.</p>
          <ul>
            <li><Check /> Automatic celebration rules</li>
            <li><Check /> Digital and local rewards</li>
            <li><Check /> Secure budgets and approvals</li>
          </ul>
        </div>
        <small><ShieldCheck /> Private by default · Sandbox rewards only</small>
      </section>
      <section className="auth-form-wrap">
        <div className="mobile-auth-logo"><Logo /></div>
        <div className="auth-form-card">
          <small>{mode === "signup" ? "START YOUR PERKJOY WORKSPACE" : mode === "forgot" ? "RESET YOUR PASSWORD" : "WELCOME BACK"}</small>
          <h2>{mode === "signup" ? "Create your PerkJoy account" : mode === "forgot" ? "Forgot your password?" : "Log in to PerkJoy"}</h2>
          <p>{mode === "signup" ? "A company credit card is required to activate your workspace." : mode === "forgot" ? "We'll send a secure reset link to your work email." : "Your team's next celebration is waiting."}</p>
          <form onSubmit={submit}>
            {mode === "signup" && <>
              <div className="form-grid">
                <label>First name<input name="firstName" required autoFocus /></label>
                <label>Last name<input name="lastName" required /></label>
              </div>
              <label>Company name<input name="companyName" required /></label>
            </>}
            <label>Work email<input name="email" type="email" required autoFocus={mode !== "signup"} /></label>
            {mode !== "forgot" && <label>Password<input name="password" type="password" required minLength={8} /></label>}
            {mode === "login" && <div className="auth-extras">
              <label><input type="checkbox" /> Remember me</label>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>}
            {message && <div className="auth-message">{message}</div>}
            <button className="button button-primary" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Continue to payment" : mode === "forgot" ? "Send reset link" : "Log in"}<ArrowRight />
            </button>
          </form>
          {mode !== "forgot" && <div className="demo-entry">
            <span>or</span>
            <Link className="button button-secondary" href="/dashboard"><Gift /> Explore the demo workspace</Link>
          </div>}
          <footer>
            {mode === "login" ? <>New to PerkJoy? <Link href="/signup">Start trial</Link></> : mode === "signup" ? <>Already have an account? <Link href="/login">Log in</Link></> : <Link href="/login">← Back to login</Link>}
          </footer>
        </div>
      </section>
    </main>
  );
}
