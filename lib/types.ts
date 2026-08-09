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

export type Workspace = {
  organization: { id: string; name: string; timezone: string; monthlyBudgetCents: number };
  employees: Employee[];
  rules: Rule[];
  rewards: Reward[];
  products: Product[];
  localOrders: LocalOrder[];
};
