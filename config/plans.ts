export const PLANS = {
  starter: { name: "Starter", monthlyPrice: 29, employeeLimit: 25 },
  growth: { name: "Growth", monthlyPrice: 79, employeeLimit: 50 },
  business: { name: "Business", monthlyPrice: 179, employeeLimit: 100 },
} as const;

export type PlanKey = keyof typeof PLANS;
