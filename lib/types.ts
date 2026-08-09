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

export type Notification = {
  id: string;
  type: "upcoming_event" | "reward_scheduled" | "approval_needed" | "reward_sent" | "reward_failed" | "local_order_confirmed" | "delivery_completed" | "budget_warning" | "automation_run";
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionLabel: string | null;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AutomationRun = {
  id: string;
  runKey: string;
  status: "completed" | "completed_with_attention";
  rulesEvaluated: number;
  momentsEvaluated: number;
  scheduledCount: number;
  approvalCount: number;
  duplicateCount: number;
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
  marketId: string;
  rating: number;
  minimumNoticeHours: number;
  availableDays: number[];
  blackoutDates: string[];
  fulfillmentMethod: "vendor_delivery" | "perkjoy_arranged" | "pickup" | "third_party";
  preferenceTags: string[];
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

export type OrganizationLocation = {
  id: string;
  marketId: string | null;
  name: string;
  locationType: "office" | "remote";
  address: string | null;
  active: boolean;
};

export type EmployeeLocation = { employeeId: string; organizationLocationId: string };

export type Bundle = {
  id: string;
  marketId: string;
  vendorName: string;
  name: string;
  description: string;
  category: string;
  customerPriceCents: number;
  active: boolean;
  items: { id: string; productId: string | null; name: string; quantity: number }[];
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

export type GiftHistory = {
  id: string;
  employeeId: string;
  recommendationId: string | null;
  title: string;
  rewardType: string;
  occasion: string;
  amountCents: number;
  status: "scheduled" | "sent" | "delivered";
  createdAt: string;
};

export type ApprovalRequest = {
  id: string;
  entityType: string;
  entityId: string;
  approvalLevel: "manager" | "admin" | "owner";
  amountCents: number;
  status: "pending" | "approved" | "rejected";
};

export type ApprovalPolicy = {
  id: string;
  name: string;
  rewardType: string;
  minimumCents: number;
  maximumCents: number | null;
  approvalLevel: "automatic" | "manager" | "admin" | "owner";
  active: boolean;
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
  participantEmployeeIds: string[];
};

export type Workspace = {
  organization: { id: string; name: string; timezone: string; monthlyBudgetCents: number };
  organizationSettings: {
    reminderDays: number[];
    notificationPreferences: { eventReminders: boolean; budgetAlerts: boolean; rewardFailures: boolean; deliveryUpdates: boolean };
    celebrationStyle: "digital" | "local" | "both";
    selectedTemplate: string | null;
    onboardingCompleted: boolean;
  };
  employees: Employee[];
  rules: Rule[];
  rewards: Reward[];
  notifications: Notification[];
  automationRuns: AutomationRun[];
  products: Product[];
  localOrders: LocalOrder[];
  celebrationTypes: CelebrationType[];
  events: EmployeeEvent[];
  profiles: CelebrationProfile[];
  markets: Market[];
  organizationLocations: OrganizationLocation[];
  employeeLocations: EmployeeLocation[];
  marketplaceMatches: Record<string, string[]>;
  bundles: Bundle[];
  recommendations: Recommendation[];
  giftHistory: GiftHistory[];
  approvals: ApprovalRequest[];
  approvalPolicies: ApprovalPolicy[];
  conciergeRequests: ConciergeRequest[];
  teamCelebrations: TeamCelebration[];
};
