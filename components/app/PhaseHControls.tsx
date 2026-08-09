"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCircle2, Clock3, Pencil, Play, ShieldCheck, Sparkles, Trash2, X, Zap } from "lucide-react";
import type { Rule, Workspace } from "@/lib/types";

type MutationResult = (Workspace & { automationResult?: { scheduled: number; approvals: number; duplicates: number; evaluated: number } }) | undefined;
type Mutate = (payload: Record<string, unknown>) => Promise<MutationResult>;
type AutomationResult = { scheduled: number; approvals: number; duplicates: number; evaluated: number };

function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }

export function AutomationOperations({ data, mutate }: { data: Workspace; mutate: Mutate }) {
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [result, setResult] = useState<AutomationResult | undefined>(undefined);
  const latest = data.automationRuns[0];

  async function runNow() {
    setRunning(true);
    const response = await mutate({ action: "runAutomation" });
    setResult(response?.automationResult);
    setRunning(false);
  }

  async function remove(rule: Rule) {
    if (!window.confirm(`Delete “${rule.name}”? Existing scheduled rewards will stay in place.`)) return;
    await mutate({ action: "deleteRule", ruleId: rule.id });
  }

  return <section className="phase-h-automation">
    <div className="automation-run-card">
      <span><Zap /></span>
      <div><small>SAFE AUTOMATION CHECK</small><h2>See what PerkJoy can handle now.</h2><p>Checks active rules against upcoming moments. Duplicate protection is always on, and live rewards stay off.</p></div>
      <button className="button button-primary" onClick={runNow} disabled={running}>{running ? <><Clock3 /> Checking…</> : <><Play /> Run now</>}</button>
    </div>
    {(result || latest) && <div className="automation-result-strip">
      <CheckCircle2 />
      <span><b>{result ? "Automation check complete" : "Latest automation check"}</b><small>{result ? `${result.scheduled} scheduled · ${result.approvals} awaiting approval · ${result.duplicates} duplicates skipped` : `${latest.scheduledCount} scheduled · ${latest.approvalCount} awaiting approval · ${latest.duplicateCount} duplicates skipped`}</small></span>
      <em>Sandbox safe</em>
    </div>}
    <div className="rule-maintenance-card">
      <header><div><small>RULE MAINTENANCE</small><h2>Edit or remove a rule</h2></div><span>{data.rules.length} total</span></header>
      <div>{data.rules.map((rule) => <article key={rule.id}><span className={rule.active ? "active" : "paused"}><Zap /></span><div><b>{rule.name}</b><small>{rule.eventType} · {rule.rewardType} · {money(rule.amountCents)} · {rule.timing}</small></div><button onClick={() => setEditing(rule)} aria-label={`Edit ${rule.name}`}><Pencil /></button><button className="danger" onClick={() => remove(rule)} aria-label={`Delete ${rule.name}`}><Trash2 /></button></article>)}</div>
    </div>
    {editing && <EditRuleModal rule={editing} close={() => setEditing(null)} mutate={async (payload) => { await mutate(payload); setEditing(null); }} />}
  </section>;
}

function EditRuleModal({ rule, close, mutate }: { rule: Rule; close: () => void; mutate: (payload: Record<string, unknown>) => Promise<void> }) {
  const [amount, setAmount] = useState(rule.amountCents / 100);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void mutate({ action: "updateRule", ruleId: rule.id, name: form.get("name"), eventType: form.get("eventType"), rewardType: form.get("rewardType"), amountCents: amount * 100, timing: form.get("timing"), approvalRequired: form.get("approvalRequired") === "on" });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && close()}><section className="modal" role="dialog" aria-modal="true" aria-label="Edit automation rule"><header><div><h2>Edit automation rule</h2><p>Changes affect future automation checks only.</p></div><button onClick={close} aria-label="Close"><X /></button></header><form onSubmit={submit}><label>Rule name<input name="name" defaultValue={rule.name} required /></label><div className="form-grid"><label>Celebration type<input name="eventType" defaultValue={rule.eventType} required /></label><label>Reward<select name="rewardType" defaultValue={rule.rewardType}><option>Digital Reward</option><option>Personalized Reward</option><option>Personalized Experience</option><option>Local Gift</option><option>Local Cake or Treat</option><option>Recognition Only</option><option>Surprise Me</option></select></label></div><div className="form-grid"><label>Maximum amount<div className="money-input"><span>$</span><input type="number" min="0" max="2500" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></div></label><label>Timing<select name="timing" defaultValue={rule.timing}><option>30 days before</option><option>14 days before</option><option>7 days before</option><option>3 days before</option><option>1 day before</option><option>On the day</option></select></label></div><label className="modal-check-row"><input type="checkbox" name="approvalRequired" defaultChecked={rule.approvalRequired} /> Require approval before purchase</label><p className="privacy-note"><ShieldCheck /> Scheduled rewards keep their original terms. This edit applies to future moments.</p><footer><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary">Save rule</button></footer></form></section></div>;
}

export function NotificationCenter({ data, close, mutate }: { data: Workspace; close: () => void; mutate: Mutate }) {
  const unread = data.notifications.filter((item) => !item.readAt).length;
  return <><button className="notification-overlay" onClick={close} aria-label="Close notifications" /><aside className="notification-center" aria-label="Notifications"><header><div><span><Bell /></span><div><small>PERKJOY UPDATES</small><h2>Notifications</h2></div></div><button onClick={close} aria-label="Close"><X /></button></header><div className="notification-summary"><Sparkles /><span><b>{unread ? `${unread} update${unread === 1 ? "" : "s"} need your attention` : "You're all caught up"}</b><small>PerkJoy keeps handled moments quiet.</small></span>{unread > 0 && <button onClick={() => mutate({ action: "markAllNotificationsRead" })}>Mark all read</button>}</div><section>{data.notifications.length ? data.notifications.map((item) => <article className={item.readAt ? "read" : ""} key={item.id}><span>{item.type === "approval_needed" ? <Clock3 /> : item.type === "automation_run" ? <Zap /> : <Check />}</span><div><small>{item.type.replaceAll("_", " ")}</small><b>{item.title}</b><p>{item.message}</p><footer>{item.actionHref && <Link href={item.actionHref} onClick={() => { void mutate({ action: "markNotificationRead", notificationId: item.id }); close(); }}>{item.actionLabel ?? "View"}</Link>}<time>{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></footer></div>{!item.readAt && <button className="notification-read-dot" onClick={() => mutate({ action: "markNotificationRead", notificationId: item.id })} aria-label={`Mark ${item.title} read`} />}</article>) : <div className="notification-empty"><CheckCircle2 /><b>Nothing needs your attention.</b><p>New automation, delivery, approval, and budget updates will appear here.</p></div>}</section></aside></>;
}
