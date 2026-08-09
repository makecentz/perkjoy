import { Gift } from "lucide-react";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-logo ${inverse ? "brand-logo--inverse" : ""}`}>
      <span className="brand-mark"><Gift size={18} strokeWidth={2.4} /></span>
      <span>PerkJoy</span>
    </span>
  );
}
