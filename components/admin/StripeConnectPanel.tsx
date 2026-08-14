"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase/fetch";

type ConnectVendor = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  demo: boolean;
  connected: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export function StripeConnectPanel() {
  const [vendors, setVendors] = useState<ConnectVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState("");

  const loadVendors = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await authenticatedFetch("/api/stripe/connect/vendors", { cache: "no-store" });
      const result = await response.json() as { vendors?: ConnectVendor[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load vendor payout status.");
      setVendors(result.vendors ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load vendor payout status."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    authenticatedFetch("/api/stripe/connect/vendors", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { vendors?: ConnectVendor[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load vendor payout status.");
        setVendors(result.vendors ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load vendor payout status."))
      .finally(() => setLoading(false));
  }, []);

  async function connect(vendorId: string) {
    setConnecting(vendorId); setError("");
    try {
      const response = await authenticatedFetch("/api/stripe/connect/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId }) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start Stripe onboarding.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to start Stripe onboarding."); setConnecting(""); }
  }

  return <section className="admin-payouts"><header><div><h1>Local vendor payouts</h1><p>Connect local partners to Stripe and monitor their ability to accept payments and receive payouts.</p></div><button type="button" className="button button-secondary" onClick={() => void loadVendors()} disabled={loading}><RefreshCw /> Refresh</button></header>{error && <div className="app-error"><span>{error}</span></div>}{loading ? <p>Loading payout accounts…</p> : <div className="stripe-connect-vendors">{vendors.map((vendor) => { const ready = vendor.chargesEnabled && vendor.payoutsEnabled; return <article key={vendor.id}><span className={ready ? "ready" : vendor.connected ? "pending" : "not-connected"}><i />{ready ? "Ready" : vendor.connected ? "Needs information" : "Not connected"}</span><div><b>{vendor.name}</b><small>{vendor.email || "Stripe will collect the vendor's email during onboarding"}</small></div><button type="button" className="button button-primary" onClick={() => void connect(vendor.id)} disabled={connecting === vendor.id}>{connecting === vendor.id ? "Opening Stripe…" : ready ? "Manage account" : vendor.connected ? "Continue onboarding" : "Connect Stripe"}</button></article>; })}</div>}</section>;
}
