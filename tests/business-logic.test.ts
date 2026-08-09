import assert from "node:assert/strict";
import test from "node:test";
import { birthdayForYear, celebrationEventKey, isLeapYear, nextAnniversary, nextBirthday } from "../lib/celebrations";
import { validateBudget } from "../lib/budget";
import type { Employee } from "../lib/types";

const employee: Employee = { id: "employee-1", firstName: "Alex", lastName: "Rivera", email: "alex@example.com", department: "Design", jobTitle: "Designer", birthdayMonth: 8, birthdayDay: 14, hireDate: "2021-08-20", status: "active" };

test("calculates the next birthday without storing a birth year", () => {
  assert.equal(nextBirthday(employee, new Date(2026, 7, 1, 12)).toISOString().slice(0, 10), "2026-08-14");
  assert.equal(nextBirthday(employee, new Date(2026, 7, 15, 12)).toISOString().slice(0, 10), "2027-08-14");
});

test("handles February 29 according to organization preference", () => {
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2027), false);
  assert.equal(birthdayForYear(2, 29, 2027, "feb28").getDate(), 28);
  assert.equal(birthdayForYear(2, 29, 2027, "mar1").getMonth(), 2);
});

test("calculates anniversary year and next date", () => {
  const result = nextAnniversary(employee, new Date(2026, 7, 1, 12));
  assert.equal(result.years, 5);
  assert.equal(result.date.toISOString().slice(0, 10), "2026-08-20");
});

test("builds deterministic keys that prevent duplicate reward events", () => {
  const first = celebrationEventKey("org-1", "employee-1", "birthday", 2026, "rule-1");
  const second = celebrationEventKey("org-1", "employee-1", "birthday", 2026, "rule-1");
  assert.equal(first, second);
  assert.notEqual(first, celebrationEventKey("org-1", "employee-1", "birthday", 2027, "rule-1"));
});

test("blocks or warns above-budget rewards according to policy", () => {
  assert.deepEqual(validateBudget(50000, 45000, 10000, true), { allowed: false, warning: "This reward would exceed the monthly budget." });
  assert.equal(validateBudget(50000, 45000, 10000, false).allowed, true);
  assert.equal(validateBudget(50000, 20000, 10000, true).warning, null);
});
