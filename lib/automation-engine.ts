import type { EmployeeEvent, Rule } from "./types";

export function timingOffsetDays(timing: string) {
  if (/on the day/i.test(timing)) return 0;
  const match = timing.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function ruleMatchesEvent(rule: Pick<Rule, "eventType">, event: Pick<EmployeeEvent, "title">, celebrationTypeName?: string) {
  const ruleType = rule.eventType.toLowerCase();
  const eventType = `${event.title} ${celebrationTypeName ?? ""}`.toLowerCase();
  if (ruleType.includes("birthday")) return eventType.includes("birthday");
  if (ruleType.includes("anniversary")) return eventType.includes("anniversary");
  if (ruleType.includes("new hire") || ruleType.includes("welcome")) return eventType.includes("new hire") || eventType.includes("welcome");
  return eventType.includes(ruleType);
}

export function isAutomationDue(eventDate: string, timing: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
  const event = new Date(`${eventDate}T12:00:00`).getTime();
  const daysUntil = Math.round((event - start) / 86400000);
  return daysUntil >= 0 && daysUntil <= timingOffsetDays(timing);
}

export function automationEventKey(organizationId: string, employeeId: string, eventDate: string, ruleId: string) {
  return ["automation", organizationId, employeeId, eventDate, ruleId].join(":");
}
