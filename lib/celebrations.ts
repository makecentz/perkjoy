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
  if (!employee.birthdayMonth || !employee.birthdayDay) return null;
  let date = birthdayForYear(employee.birthdayMonth, employee.birthdayDay, now.getFullYear());
  date.setHours(12, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (date < today) date = birthdayForYear(employee.birthdayMonth, employee.birthdayDay, now.getFullYear() + 1);
  return date;
}

export function nextAnniversary(employee: Employee, now = new Date()) {
  if (!employee.hireDate) return null;
  const hire = new Date(`${employee.hireDate}T12:00:00`);
  let date = new Date(now.getFullYear(), hire.getMonth(), hire.getDate(), 12);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (date < today) date = new Date(now.getFullYear() + 1, hire.getMonth(), hire.getDate(), 12);
  return { date, years: date.getFullYear() - hire.getFullYear() };
}

export function todayInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Number(value.year), Number(value.month) - 1, Number(value.day), 12);
}

export function nextEmployeeCelebration(employee: Employee, now = new Date()) {
  const birthday = nextBirthday(employee, now);
  const anniversary = nextAnniversary(employee, now);
  const candidates: { type: "birthday" | "anniversary"; date: Date; label: string }[] = [];
  if (birthday) candidates.push({ type: "birthday", date: birthday, label: "Birthday" });
  if (anniversary) candidates.push({ type: "anniversary", date: anniversary.date, label: `${anniversary.years} Year Anniversary` });
  if (!candidates.length) return null;
  const next = candidates.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return { ...next, days: Math.max(0, Math.round((next.date.getTime() - start.getTime()) / 86400000)) };
}

export function celebrationEventKey(organizationId: string, employeeId: string, eventType: string, year: number, ruleId: string) {
  return [organizationId, employeeId, eventType, year, ruleId].join(":");
}
