"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, RefreshCw, TriangleAlert } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase/fetch";

type Status = { id: string; name: string; description: string; health: "ok" | "down" | "configured" | "missing"; detail: string; identifier?: string };
type StatusResponse = { statuses?: Status[]; manageUrl?: string; checkedAt?: string; error?: string };

export function AdminIntegrationSettings() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [manageUrl, setManageUrl] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await authenticatedFetch("/api/admin/integrations", { cache: "no-store" });
      const result = await response.json() as StatusResponse;
      if (!response.ok) throw new Error(result.error || "Unable to check integrations.");
      setStatuses(result.statuses ?? []); setManageUrl(result.manageUrl ?? ""); setCheckedAt(result.checkedAt ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to check integrations."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    authenticatedFetch("/api/admin/integrations", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as StatusResponse;
        if (!response.ok) throw new Error(result.error || "Unable to check integrations.");
        setStatuses(result.statuses ?? []); setManageUrl(result.manageUrl ?? ""); setCheckedAt(result.checkedAt ?? "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to check integrations."))
      .finally(() => setLoading(false));
  }, []);

  return <section className="admin-integrations">
    <header><div><h1>Integration settings</h1><p>Monitor PerkJoy’s connected services and securely replace production credentials.</p></div><button className="button button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw /> {loading ? "Checking…" : "Check status"}</button></header>
    <div className="admin-secret-notice"><KeyRound /><div><b>Secrets stay protected</b><p>PerkJoy never displays full API keys. Credential changes are made in Vercel’s encrypted production environment and require a redeployment.</p></div></div>
    {error && <div className="app-error"><span>{error}</span></div>}
    <div className="admin-integration-list">
      {statuses.map((item) => <article key={item.id}>
        <span className={`integration-light ${item.health}`} aria-label={item.health} />
        <div><h2>{item.name}</h2><p>{item.description}</p>{item.identifier && <code>{item.identifier}</code>}</div>
        <div className="integration-result">{item.health === "ok" ? <CheckCircle2 /> : item.health === "down" || item.health === "missing" ? <TriangleAlert /> : <KeyRound />}<span><b>{item.health === "ok" ? "Status OK" : item.health === "configured" ? "Configured" : item.health === "missing" ? "Missing" : "Action needed"}</b><small>{item.detail}</small></span></div>
        <a href={manageUrl} target="_blank" rel="noreferrer">Change securely <ExternalLink /></a>
      </article>)}
    </div>
    {checkedAt && <footer>Last checked {new Date(checkedAt).toLocaleString()}</footer>}
  </section>;
}
