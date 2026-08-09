export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  birthdayMonth: number;
  birthdayDay: number;
  hireDate: string;
  status: "active" | "inactive";
  workMode?: "office" | "remote" | "hybrid";
  preferredDelivery?: "workplace" | "home" | "digital_only";
  locationId?: string | null;
};

export type Rule = {
  id: string;
  name: string;
  eventType: string;
  rewardType: string;
  amountCents: number;
  timing: string;
  active: boolean;
  approvalRequired: boolean;
};

export type Reward = {
  id: string;
  employeeId: string;
  recognitionType: string;
  message: string;
  amountCents: number;
  status: string;
  provider: string;
  createdAt: string;
};

export type Product = {
  id: string;
  vendorName: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  deliveryFeeCents: number;
  servesPeople: number;
  demo: boolean;
};

export type LocalOrder = {
  id: string;
  employeeId: string;
  productId: string;
  deliveryDate: string;
  totalCents: number;
  status: string;
  createdAt: string;
};

export type CelebrationStatus = "needs_attention" | "scheduled" | "approval_required" | "handled" | "delivered" | "skipped";

export type CelebrationType = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  category: "career" | "life";
  active: boolean;
  manualOnly: boolean;
};

export type EmployeeEvent = {
  id: string;
  employeeId: string;
  celebrationTypeId: string | null;
  title: string;
  eventDate: string;
  category: "career" | "life";
  status: CelebrationStatus;
  rewardSummary: string;
  handledSteps: string;
};

export type CelebrationProfile = {
  id: string;
  employeeId: string;
  inviteToken: string;
  inviteExpiresAt: string;
  completeness: number;
  privacyMode: "share_with_hr" | "recommendations_only";
  workMode: "office" | "remote" | "hybrid";
  preferredDelivery: "workplace" | "home" | "digital_only";
};

export type Market = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  active: boolean;
  launchStatus: "active" | "coming_soon";
};

export type Bundle = {
  id: string;
  marketId: string;
  vendorName: string;
  name: string;
  description: string;
  category: string;
  customerPriceCents: number;
  active: boolean;
  items: { id: string; name: string; quantity: number }[];
};

export type Recommendation = {
  id: string;
  employeeId: string;
  employeeEventId: string | null;
  rewardType: string;
  title: string;
  amountCents: number;
  recommendationScore: number;
  recommendationReason: string;
  somethingDifferent: boolean;
  status: "recommended" | "awaiting_approval" | "approved" | "rejected";
};

export type ApprovalRequest = {
  id: string;
  entityType: string;
  entityId: string;
  approvalLevel: "manager" | "admin" | "owner";
  amountCents: number;
  status: "pending" | "approved" | "rejected";
};

export type ConciergeRequest = {
  id: string;
  employeeId: string;
  occasion: string;
  budgetCents: number;
  deliveryDate: string;
  status: "submitted" | "planning" | "recommendation_ready" | "awaiting_approval" | "approved" | "ordered" | "delivered";
  recommendation: string | null;
};

export type TeamCelebration = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  department: string | null;
  rewardMode: "individual" | "team_experience";
  budgetCents: number;
  status: string;
};

export type Workspace = {
  organization: { id: string; name: string; timezone: string; monthlyBudgetCents: number };
  employees: Employee[];
  rules: Rule[];
  rewards: Reward[];
  products: Product[];
  localOrders: LocalOrder[];
  celebrationTypes: CelebrationType[];
  events: EmployeeEvent[];
  profiles: CelebrationProfile[];
  markets: Market[];
  bundles: Bundle[];
  recommendations: Recommendation[];
  approvals: ApprovalRequest[];
  conciergeRequests: ConciergeRequest[];
  teamCelebrations: TeamCelebration[];
};
