"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock3, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase/fetch";

type Entry = { id: string; name: string; kind: "reward" | "subscription"; plan: string; verified: boolean; active: boolean };
type Settings = { enabled: boolean; initialDelaySeconds: number; displayDurationSeconds: number; intervalSeconds: number; entries: Entry[]; updatedAt?: string; error?: string };

export function AdminSocialProofSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/social-proof", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() as Settings }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) { setStatus("error"); setMessage(data.error || "Unable to load social proof settings."); return; }
        setSettings(data); setStatus("idle");
      })
      .catch(() => { if (active) { setStatus("error"); setMessage("Unable to load social proof settings."); } });
    return () => { active = false; };
  }, []);

  function updateEntry(id: string, patch: Partial<Entry>) {
    setSettings((current) => current ? { ...current, entries: current.entries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) } : current);
    setStatus("idle"); setMessage("");
  }
  async function save() {
    if (!settings) return;
    setStatus("saving"); setMessage("");
    try {
      const response = await authenticatedFetch("/api/social-proof", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json() as { error?: string; updatedAt?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save social proof settings.");
      setSettings({ ...settings, updatedAt: data.updatedAt }); setStatus("saved"); setMessage("Homepage activity settings are live.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Unable to save social proof settings."); }
  }

  if (!settings) return <section className="admin-social-proof"><header><div><h2>Homepage social proof</h2><p>{message || "Loading activity settings…"}</p></div></header></section>;
  return <section className="admin-social-proof"><header><div><h2>Homepage social proof</h2><p>Manage the bottom-right activity notification shown only on the public homepage.</p></div><label className="social-proof-toggle"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /><span>{settings.enabled ? <Eye /> : <EyeOff />}{settings.enabled ? "Enabled" : "Hidden"}</span></label></header><div className="social-proof-truth"><BadgeCheck /><p><b>Truthful by design</b><small>Starter names remain labeled “Example activity.” Mark an entry verified only when it represents a real customer or reward event.</small></p></div><div className="social-proof-timing"><Clock3 /><label>First popup<input type="number" min="0" max="120" value={settings.initialDelaySeconds} onChange={(event) => setSettings({ ...settings, initialDelaySeconds: Number(event.target.value) })} /><small>seconds</small></label><label>Visible for<input type="number" min="3" max="30" value={settings.displayDurationSeconds} onChange={(event) => setSettings({ ...settings, displayDurationSeconds: Number(event.target.value) })} /><small>seconds</small></label><label>Time between<input type="number" min="8" max="300" value={settings.intervalSeconds} onChange={(event) => setSettings({ ...settings, intervalSeconds: Number(event.target.value) })} /><small>seconds</small></label></div><div className="social-proof-entry-head"><div><h3>Activity library</h3><p>{settings.entries.length} names · {settings.entries.filter((entry) => entry.verified).length} verified</p></div><button className="button button-secondary" type="button" onClick={() => setSettings({ ...settings, entries: [...settings.entries, { id: crypto.randomUUID(), name: "New name", kind: "reward", plan: "", verified: false, active: true }] })}><Plus />Add activity</button></div><div className="social-proof-entries">{settings.entries.map((entry, position) => <article key={entry.id}><span>{String(position + 1).padStart(2, "0")}</span><label>Name<input value={entry.name} maxLength={50} onChange={(event) => updateEntry(entry.id, { name: event.target.value })} /></label><label>Activity<select value={entry.kind} onChange={(event) => updateEntry(entry.id, { kind: event.target.value as Entry["kind"] })}><option value="reward">Reward sent</option><option value="subscription">Subscription</option></select></label><label>Plan<input value={entry.plan} disabled={entry.kind === "reward"} placeholder="Growth" onChange={(event) => updateEntry(entry.id, { plan: event.target.value })} /></label><label className="entry-check"><input type="checkbox" checked={entry.verified} onChange={(event) => updateEntry(entry.id, { verified: event.target.checked })} />Verified</label><label className="entry-check"><input type="checkbox" checked={entry.active} onChange={(event) => updateEntry(entry.id, { active: event.target.checked })} />Active</label><button type="button" aria-label={`Remove ${entry.name}`} disabled={settings.entries.length === 1} onClick={() => setSettings({ ...settings, entries: settings.entries.filter((item) => item.id !== entry.id) })}><Trash2 /></button></article>)}</div><footer><span className={status}>{message}</span><button className="button button-primary" type="button" onClick={() => void save()} disabled={status === "saving"}><Save />{status === "saving" ? "Saving…" : "Save social proof"}</button></footer></section>;
}
