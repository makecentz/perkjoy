export function trackGameEvent(name: string, detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("perkjoy:analytics", { detail: { name, ...detail } }));
  const target = window as Window & { gtag?: (...args: unknown[]) => void };
  target.gtag?.("event", name, detail);
}
