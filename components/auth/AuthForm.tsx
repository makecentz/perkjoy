"use client";
/* eslint-disable jsx-a11y/no-autofocus */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (!configured) {
      setMessage("Supabase is not configured for this deployment.");
      setBusy(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createBrowserSupabaseClient();
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
            emailRedirectTo: `${location.origin}/onboarding`,
            data: {
              first_name: form.get("firstName"),
              last_name: form.get("lastName"),
              company_name: form.get("companyName"),
              employee_count: form.get("employeeCount"),
              city: form.get("city"),
              state: form.get("state"),
              postal_code: form.get("postalCode"),
              timezone: form.get("timezone"),
            },
          },
        });

    if (result.error) setMessage(result.error.message);
    else if (mode === "forgot") setMessage("Check your email for a secure reset link.");
    else if (mode === "signup") {
      const session = await supabase.auth.getSession();
      if (session.data.session) location.href = "/onboarding";
      else setMessage("Check your email to confirm your account, then log in to finish setup.");
    }
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
          <p>{mode === "signup" ? "A credit card is required to activate your workspace." : mode === "forgot" ? "We'll send a secure reset link to your work email." : "Your team's next celebration is waiting."}</p>
          <form onSubmit={submit}>
            {mode === "signup" && <>
              <div className="form-grid">
                <label>First name<input name="firstName" required autoFocus /></label>
                <label>Last name<input name="lastName" required /></label>
              </div>
              <label>Company name<input name="companyName" required /></label>
              <label>Approximate team size<select name="employeeCount" defaultValue="26-100"><option>1-25</option><option>26-100</option><option>101-300</option><option>301+</option></select></label>
              <div className="form-grid three">
                <label>City<input name="city" required /></label>
                <label>State<input name="state" required maxLength={2} /></label>
                <label>ZIP<input name="postalCode" required inputMode="numeric" /></label>
              </div>
              <label>Timezone<select name="timezone" defaultValue="America/New_York"><option value="America/New_York">Eastern Time</option><option value="America/Chicago">Central Time</option><option value="America/Denver">Mountain Time</option><option value="America/Los_Angeles">Pacific Time</option></select></label>
            </>}
            <label>Work email<input name="email" type="email" required autoFocus={mode !== "signup"} /></label>
            {mode !== "forgot" && <label>Password<input name="password" type="password" required minLength={8} /></label>}
            {mode === "login" && <div className="auth-extras">
              <label><input type="checkbox" /> Remember me</label>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>}
            {message && <div className="auth-message">{message}</div>}
            <button className="button button-primary" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create workspace" : mode === "forgot" ? "Send reset link" : "Log in"}<ArrowRight />
            </button>
          </form>
          <footer>
            {mode === "login" ? <>New to PerkJoy? <Link href="/signup">Start trial</Link></> : mode === "signup" ? <>Already have an account? <Link href="/login">Log in</Link></> : <Link href="/login">← Back to login</Link>}
          </footer>
        </div>
      </section>
    </main>
  );
}
