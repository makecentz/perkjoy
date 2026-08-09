export function validateBudget(monthlyBudgetCents: number, committedCents: number, proposedCents: number, preventAboveBudget: boolean) {
  if (![monthlyBudgetCents, committedCents, proposedCents].every(Number.isFinite) || proposedCents < 0) return { allowed: false, warning: "Invalid reward amount." };
  const remainingCents = monthlyBudgetCents - committedCents;
  if (proposedCents <= remainingCents) return { allowed: true, warning: null };
  return preventAboveBudget
    ? { allowed: false, warning: "This reward would exceed the monthly budget." }
    : { allowed: true, warning: "This reward exceeds the remaining monthly budget and requires review." };
}
