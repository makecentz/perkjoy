import type { Employee } from "./types";

export function birthdayForYear(month: number, day: number, year: number, leapPreference: "feb28" | "mar1" = "feb28") {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return leapPreference === "feb28" ? new Date(year, 1, 28) : new Date(year, 2, 1);
  }
  return new Date(year, month - 1, day);
}

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function nextBirthday(employee: Employee, now = new Date()) {
  let date = birthdayForYear(employee.birthdayMonth, employee.birthdayDay, now.getFullYear());
  date.setHours(12, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (date < today) date = birthdayForYear(employee.birthdayMonth, employee.birthdayDay, now.getFullYear() + 1);
  return date;
}

export function nextAnniversary(employee: Employee, now = new Date()) {
  const hire = new Date(`${employee.hireDate}T12:00:00`);
  let date = new Date(now.getFullYear(), hire.getMonth(), hire.getDate(), 12);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (date < today) date = new Date(now.getFullYear() + 1, hire.getMonth(), hire.getDate(), 12);
  return { date, years: date.getFullYear() - hire.getFullYear() };
}

export function celebrationEventKey(organizationId: string, employeeId: string, eventType: string, year: number, ruleId: string) {
  return [organizationId, employeeId, eventType, year, ruleId].join(":");
}
