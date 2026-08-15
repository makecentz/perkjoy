"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import Image from "next/image";

type Entry = { id: string; name: string; kind: "reward" | "subscription"; plan: string; verified: boolean; active: boolean };
type Config = { enabled: boolean; initialDelaySeconds: number; displayDurationSeconds: number; intervalSeconds: number; entries: Entry[] };

export function SocialProofToast() {
  const [config, setConfig] = useState<Config | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/social-proof", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<Config> : null)
      .then((data) => { if (data) setConfig(data); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!config?.enabled || dismissed) return;
    const entries = config.entries.filter((entry) => entry.active);
    if (!entries.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopped = false;
    let nextIndex = Math.floor(Math.random() * entries.length);

    const present = () => {
      if (stopped) return;
      setIndex(nextIndex); setVisible(true);
      timers.push(setTimeout(() => {
        setVisible(false);
        nextIndex = (nextIndex + 1) % entries.length;
        timers.push(setTimeout(present, config.intervalSeconds * 1000));
      }, config.displayDurationSeconds * 1000));
    };
    timers.push(setTimeout(present, config.initialDelaySeconds * 1000));
    return () => { stopped = true; timers.forEach(clearTimeout); };
  }, [config, dismissed]);

  const entries = config?.entries.filter((entry) => entry.active) ?? [];
  const entry = entries[index % Math.max(entries.length, 1)];
  if (!config?.enabled || !entry || dismissed) return null;
  const message = entry.kind === "reward" ? <>A reward was just sent to <b>{entry.name}</b></> : <><b>{entry.name}</b> joined PerkJoy on {entry.plan || "a subscription"}</>;

  return <aside className={`social-proof-toast ${visible ? "visible" : ""}`} aria-hidden={!visible}>
    <span className="social-proof-art" aria-hidden="true"><Image src="/perkjoy-logo-transparent.png" alt="" width={174} height={58} /></span>
    <div role="status" aria-live="polite"><small>NOW HAPPENING</small><p>{message}</p><em><Check /> {entry.verified ? "Just now" : "Illustrative preview"}</em></div>
    <button type="button" aria-label="Hide activity notifications" onClick={() => { setDismissed(true); setVisible(false); }}><X /></button>
  </aside>;
}
