import assert from "node:assert/strict";
import test from "node:test";
import { celebrationResult, eventDuration, makeEvent, rankForScore } from "../lib/game/simulation";

test("birthday card, cake, and balloons create a perfect celebration", () => {
  const event = makeEvent("birthday", "alex", 1, 1);
  const result = celebrationResult(event, ["card", "cake", "balloons"]);
  assert.equal(result.perfect, true);
  assert.equal(result.combo, 3);
  assert.equal(result.label, "PERFECT CELEBRATION");
  assert.ok(result.score >= 500);
  assert.ok(result.morale > 6);
});

test("delivery events begin with Riley pickup", () => {
  const event = makeEvent("delivery", "taylor", 4, 9);
  assert.equal(event.stage, "pickup");
  assert.equal(event.employeeId, "taylor");
  assert.ok(event.remaining > 0);
});

test("event timers get more urgent in later levels", () => {
  assert.ok(eventDuration("birthday", 5) < eventDuration("birthday", 1));
  assert.ok(eventDuration("delivery", 5) >= 12);
});

test("manager ranks advance at stable score thresholds", () => {
  assert.equal(rankForScore(0), "Needs Improvement");
  assert.equal(rankForScore(7000), "People Champion");
  assert.equal(rankForScore(22000), "Ultimate People Manager");
});
