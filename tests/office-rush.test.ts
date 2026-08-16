import assert from "node:assert/strict";
import test from "node:test";
import { officeColliders } from "../lib/game/config";
import { celebrationResult, eventDuration, makeEvent, moveWithOfficeCollisions, rankForScore } from "../lib/game/simulation";

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
  assert.ok(["balloons", "card", "cake"].includes(event.deliveryReward ?? ""));
  assert.ok(event.remaining > 0);
});

test("desk colliders stop the player and allow sliding along the edge", () => {
  const desk = officeColliders.find((collider) => collider.id === "center-desk-1");
  assert.ok(desk);
  const start = { x: desk.x - 18, y: desk.y + desk.height / 2 };
  const blocked = moveWithOfficeCollisions(start, { x: 30, y: 0 }, officeColliders, 17);
  assert.equal(blocked.x, start.x);
  const sliding = moveWithOfficeCollisions(start, { x: 30, y: 12 }, officeColliders, 17);
  assert.equal(sliding.x, start.x);
  assert.ok(sliding.y > start.y);
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
