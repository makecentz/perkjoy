"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, Building2, CircleDollarSign, HandCoins, ReceiptText, RefreshCcw, Save, Undo2 } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase/fetch";

type Metrics = {
  grossTransactionVolumeCents: number;
  merchandiseGmvCents: number;
  platformRevenueCents: number;
  vendorPayoutsCents: number;
  mrrCents: number;
  conciergeRevenueCents: number;
  refundedVolumeCents: number;
  settledOrders: number;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function AdminFinancials({ initialRateBps, updatedAt, metrics }: { initialRateBps: number; updatedAt: string; metrics: Metrics }) {
  const [savedRateBps, setSavedRateBps] = useState(initialRateBps);
  const [rate, setRate] = useState((initialRateBps / 100).toFixed(2));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const rateBps = useMemo(() => Math.round(Number(rate) * 100), [rate]);
  const exampleFee = Number.isFinite(rateBps) ? Math.round(10000 * rateBps / 10000) : 0;
  const dirty = Number.isFinite(rateBps) && rateBps !== savedRateBps;

  async function save() {
    setStatus("saving"); setMessage("");
    const response = await authenticatedFetch("/api/admin/financials", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ rateBps }) });
    const data = await response.json().catch(() => ({})) as { error?: string; rateBps?: number };
    if (!response.ok) { setStatus("error"); setMessage(data.error || "The transaction rate could not be saved."); return; }
    const savedRate = data.rateBps ?? rateBps;
    setSavedRateBps(savedRate); setRate((savedRate / 100).toFixed(2)); setStatus("saved"); setMessage("New Local orders will use this rate. Existing orders keep their original rate.");
  }

  const cards = [
    ["Gross transaction volume", money(metrics.grossTransactionVolumeCents), `${metrics.settledOrders} settled Local orders`, ReceiptText],
    ["PerkJoy transaction revenue", money(metrics.platformRevenueCents), "Recorded platform fees", BadgeDollarSign],
    ["Vendor payouts", money(metrics.vendorPayoutsCents), "Merchandise and delivery after fees", HandCoins],
    ["Monthly recurring revenue", money(metrics.mrrCents), "Active business subscriptions", Building2],
  ] as const;

  return <div className="admin-financials"><header><div><h1>Financials</h1><p>Revenue, transaction economics, and vendor obligations in one controlled view.</p></div><span><i /> Server-calculated</span></header><section className="financial-kpis">{cards.map(([label,value,note,Icon]) => <article key={label}><Icon /><span><small>{label}</small><b>{value}</b><em>{note}</em></span></article>)}</section><div className="financial-workspace"><section className="admin-panel financial-breakdown"><div className="admin-panel-head"><div><h2>Revenue breakdown</h2><p>Settled activity only; refunded volume is tracked separately.</p></div><CircleDollarSign /></div><dl><div><dt>Local merchandise GMV</dt><dd>{money(metrics.merchandiseGmvCents)}</dd></div><div><dt>Concierge revenue</dt><dd>{money(metrics.conciergeRevenueCents)}</dd></div><div><dt>Refunded volume</dt><dd>{money(metrics.refundedVolumeCents)}</dd></div><div><dt>PerkJoy recognized revenue</dt><dd>{money(metrics.platformRevenueCents + metrics.conciergeRevenueCents + metrics.mrrCents)}</dd></div></dl></section><section className="admin-panel fee-control"><div className="admin-panel-head"><div><h2>Local transaction rate</h2><p>Applied to merchandise subtotal. Delivery passes through to the vendor.</p></div><BadgeDollarSign /></div><label htmlFor="transaction-rate">PerkJoy rate</label><div className="rate-input"><input id="transaction-rate" type="number" min="0" max="50" step="0.01" value={rate} onChange={(event) => { setRate(event.target.value); setStatus("idle"); setMessage(""); }} aria-describedby="rate-help" /><span>%</span></div><p id="rate-help">At this rate, PerkJoy receives <b>{money(exampleFee)}</b> from a $100 merchandise order.</p><div className="fee-actions"><button className="button button-secondary" type="button" disabled={!dirty || status === "saving"} onClick={() => { setRate((savedRateBps / 100).toFixed(2)); setMessage(""); }}><Undo2 />Reset</button><button className="button button-primary" type="button" disabled={!dirty || status === "saving" || rateBps < 0 || rateBps > 5000} onClick={save}>{status === "saving" ? <RefreshCcw className="spin" /> : <Save />}{status === "saving" ? "Saving…" : "Save rate"}</button></div>{message && <p className={`fee-message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}<small>Last changed {new Date(updatedAt).toLocaleString()}</small></section></div></div>;
}
