import assert from "node:assert/strict";
import test from "node:test";
import { birthdayForYear, celebrationEventKey, isLeapYear, nextAnniversary, nextBirthday } from "../lib/celebrations";
import { validateBudget } from "../lib/budget";
import type { Employee } from "../lib/types";
import { RuleBasedRecommendationProvider } from "../services/recommendations/CelebrationRecommendationService";
import { allowedStrings, hashProfileToken, PROFILE_INTERESTS, profileCompleteness } from "../lib/celebration-profile";

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

test("recommends a local favorite when delivery, market, and budget allow it", () => {
  const result = new RuleBasedRecommendationProvider().recommend({
    employeeName: "Sarah", occasion: "Birthday", budgetCents: 7500, workMode: "hybrid",
    preferredDelivery: "workplace", favoriteCake: "Chocolate", marketActive: true,
  });
  assert.equal(result.rewardType, "local");
  assert.equal(result.title, "Chocolate Birthday Cake");
  assert.equal(result.requiresApproval, true);
  assert.match(result.reason, /favorite cake flavor/);
});

test("avoids repeating a previous local gift and falls back to digital", () => {
  const result = new RuleBasedRecommendationProvider().recommend({
    employeeName: "Marcus", occasion: "Birthday", budgetCents: 5000, workMode: "remote",
    preferredDelivery: "digital_only", favoriteDrink: "Coffee", marketActive: true,
    previousGiftTitles: ["Amazon digital reward"],
  });
  assert.equal(result.rewardType, "digital");
  assert.equal(result.title, "Starbucks digital reward");
  assert.equal(result.somethingDifferent, true);
});

test("requires employer approval for a Surprise Me physical recommendation", () => {
  const result = new RuleBasedRecommendationProvider().recommend({
    employeeName: "Sarah", occasion: "Birthday", budgetCents: 7500, workMode: "hybrid", preferredDelivery: "workplace",
    favoriteCake: "Chocolate", marketActive: true, previousGiftTitles: ["$50 Target digital reward"], surpriseMe: true,
  });
  assert.equal(result.rewardType, "local");
  assert.equal(result.title, "Chocolate Birthday Cake");
  assert.equal(result.requiresApproval, true);
  assert.equal(result.somethingDifferent, true);
});

test("hashes celebration profile tokens before storage", async () => {
  const hash = await hashProfileToken("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH");
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes("abcdefghijklmnopqrstuvwxyz"), false);
});

test("calculates profile completeness by optional section", () => {
  assert.equal(profileCompleteness({ food: {}, stores: [], rewardTypes: [], interests: [], dietary: [], shirtSize: "", preferredDelivery: "" }), 0);
  assert.equal(profileCompleteness({ food: { cake: "Chocolate" }, stores: [], rewardTypes: ["Food"], interests: ["Books"], dietary: [], shirtSize: "", preferredDelivery: "workplace" }), 67);
});

test("drops unsupported private-profile selections", () => {
  assert.deepEqual(allowedStrings(["Books", "Unknown", "Books"], PROFILE_INTERESTS, 12), ["Books"]);
});
