import Image from "next/image";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-logo ${inverse ? "brand-logo--inverse" : ""}`}>
      <Image className="brand-logo-light" src="/perkjoy-logo-transparent.png" alt="PerkJoy" width={1920} height={1080} />
      <Image className="brand-logo-dark" src="/perkjoy-logo-dark.png" alt="PerkJoy" width={1920} height={1080} />
    </span>
  );
}
