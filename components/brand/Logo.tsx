export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-logo ${inverse ? "brand-logo--inverse" : ""}`}>
      <img src="/perkjoy-logo-transparent.png" alt="PerkJoy" />
    </span>
  );
}
