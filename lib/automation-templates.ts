export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  rules: { name: string; eventType: string; rewardType: string; amountCents: number; timing: string; approvalRequired: boolean }[];
};

export const automationTemplates: AutomationTemplate[] = [
  { id: "simple-birthday", name: "Simple Birthday", description: "A reliable $25 digital reward for every birthday.", bestFor: "Small teams that want an easy start", rules: [{ name: "Simple Birthday", eventType: "Birthday", rewardType: "Digital Reward", amountCents: 2500, timing: "7 days before", approvalRequired: false }] },
  { id: "birthday-plus", name: "Birthday Plus", description: "A personalized birthday recommendation with a $50 limit.", bestFor: "Teams focused on personalization", rules: [{ name: "Birthday Plus", eventType: "Birthday", rewardType: "Personalized Reward", amountCents: 5000, timing: "14 days before", approvalRequired: false }] },
  { id: "milestone-company", name: "Milestone Company", description: "Birthdays plus increasingly meaningful anniversary moments.", bestFor: "Growing companies with long-tenured teams", rules: [{ name: "Birthday Reward", eventType: "Birthday", rewardType: "Digital Reward", amountCents: 2500, timing: "7 days before", approvalRequired: false }, { name: "1 Year Anniversary", eventType: "Work Anniversary", rewardType: "Digital Reward", amountCents: 5000, timing: "14 days before", approvalRequired: false }, { name: "5 Year Anniversary", eventType: "Work Anniversary", rewardType: "Personalized Reward", amountCents: 10000, timing: "30 days before", approvalRequired: true }, { name: "10 Year Anniversary", eventType: "Work Anniversary", rewardType: "Personalized Experience", amountCents: 20000, timing: "30 days before", approvalRequired: true }] },
  { id: "local-celebration", name: "Local Celebration", description: "A local cake or treat for birthdays when delivery is available.", bestFor: "Philadelphia office and hybrid teams", rules: [{ name: "Local Birthday Celebration", eventType: "Birthday", rewardType: "Local Cake or Treat", amountCents: 7900, timing: "14 days before", approvalRequired: true }] },
];

export function getAutomationTemplate(id: string) { return automationTemplates.find((template) => template.id === id); }
