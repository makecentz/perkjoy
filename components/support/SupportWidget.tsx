"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, LoaderCircle, MessageCircle, Plus, Send, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase/fetch";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";

type Conversation = { id: string; subject: string; status: string; priority: string; last_message_at: string; created_at: string };
type SupportMessage = { id: string; conversation_id: string; sender_role: string; body: string; created_at: string };

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTicket, setNewTicket] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((item) => item.id === selectedId) || conversations[0];
  const thread = useMemo(() => messages.filter((item) => item.conversation_id === selected?.id), [messages, selected?.id]);

  async function load() {
    try {
      const response = await authenticatedFetch("/api/support", { cache: "no-store" });
      const data = await response.json() as { conversations?: Conversation[]; messages?: SupportMessage[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load support.");
      setConversations(data.conversations || []); setMessages(data.messages || []);
      setSelectedId((current) => current || data.conversations?.[0]?.id || null); setSignedIn(true); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load support."); }
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) { const timer = window.setTimeout(() => setSignedIn(false), 0); return () => window.clearTimeout(timer); }
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (!open || !signedIn) return; const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [open, signedIn]);
  useEffect(() => {
    if (!open || !signedIn) return;
    const interval = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(interval);
  }, [open, signedIn]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [thread.length, open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const payload = newTicket || !selected ? { action: "create", subject: form.get("subject"), message: form.get("message") } : { action: "reply", conversationId: selected.id, message: form.get("message") };
      const response = await authenticatedFetch("/api/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { conversationId?: string; error?: string }; if (!response.ok) throw new Error(data.error || "Unable to send message.");
      event.currentTarget.reset(); setNewTicket(false); setSelectedId(data.conversationId || null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to send message."); }
    finally { setBusy(false); }
  }

  return <div className={`support-widget ${open ? "open" : ""}`}>
    {open && <section className="support-panel" aria-label="PerkJoy support chat">
      <header><span><Headphones /><span><b>PerkJoy Support</b><small>We’re here to help</small></span></span><button type="button" onClick={() => setOpen(false)} aria-label="Close support"><X /></button></header>
      {signedIn === null ? <div className="support-state"><LoaderCircle className="spin" /> Checking your account…</div> : !signedIn ? <div className="support-state"><MessageCircle /><h3>How can we help?</h3><p>Sign in to start a secure support conversation and keep its full history.</p><Link className="button button-primary" href="/login">Sign in</Link><Link href="/contact">Or contact us</Link></div> : <>
        <nav className="support-thread-nav"><select aria-label="Support conversations" value={selected?.id || ""} onChange={(event) => { setSelectedId(event.target.value); setNewTicket(false); }}><option value="">No conversations yet</option>{conversations.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.status}</option>)}</select><button type="button" onClick={() => setNewTicket(true)}><Plus /> New</button></nav>
        {newTicket || !selected ? <form className="support-compose support-new" onSubmit={send}><h3>Start a conversation</h3><label>What do you need help with?<input name="subject" required maxLength={180} placeholder="Billing, an order, account access…" /></label><label>Tell us what happened<textarea name="message" required rows={5} maxLength={4000} /></label>{error && <p>{error}</p>}<button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Send />} Send to support</button></form> : <>
          <div className="support-thread-heading"><div><b>{selected.subject}</b><small>Started {new Date(selected.created_at).toLocaleDateString()}</small></div><em data-status={selected.status}>{selected.status}</em></div>
          <div className="support-messages">{thread.map((item) => <article key={item.id} className={item.sender_role}><small>{item.sender_role === "admin" ? "PerkJoy Support" : "You"}</small><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></article>)}<div ref={endRef} /></div>
          {selected.status === "closed" ? <div className="support-closed"><b>This conversation is closed.</b><button type="button" onClick={() => setNewTicket(true)}>Start a new conversation</button></div> : <form className="support-compose" onSubmit={send}><textarea name="message" required rows={2} maxLength={4000} aria-label="Reply to support" placeholder="Write a reply…" />{error && <p>{error}</p>}<button aria-label="Send reply" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Send />}</button></form>}
        </>}
      </>}
    </section>}
    <button className="support-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close support" : "Open support chat"}>{open ? <X /> : <MessageCircle />}<span>Support</span></button>
  </div>;
}
