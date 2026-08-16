import { eventLabels, recommendedRewards, rewards } from "./config";
import type { CelebrationResult, EventType, OfficeEvent, RewardId } from "@/types/game";

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function eventDuration(type: EventType, levelId: number) {
  const base = type === "delivery" ? 30 : type === "birthday" ? 24 : 21;
  return Math.max(12, base - Math.max(0, levelId - 1));
}

export function celebrationResult(event: OfficeEvent, selected: RewardId[]): CelebrationResult {
  const expected = recommendedRewards[event.type];
  const chosen = Array.from(new Set(selected));
  const rewardPoints = chosen.reduce((total, id) => total + (rewards.find((reward) => reward.id === id)?.points ?? 0), 0);
  const matched = chosen.filter((id) => expected.includes(id)).length;
  const perfect = event.type === "birthday" && ["card", "cake", "balloons"].every((id) => chosen.includes(id as RewardId));
  const speedBonus = event.remaining >= event.duration * .55 ? 50 : 0;
  const combo = perfect ? 3 : Math.max(1, matched);
  const score = (eventLabels[event.type].base + rewardPoints + speedBonus + (perfect ? 500 : 0)) * combo;
  return {
    score,
    morale: perfect ? 12 : matched ? 6 + Math.min(3, matched) : 2,
    combo,
    perfect,
    label: perfect ? "PERFECT CELEBRATION" : matched > 1 ? "THOUGHTFUL COMBO" : `${eventLabels[event.type].label.toUpperCase()} HANDLED`,
  };
}

export function rankForScore(score: number) {
  if (score >= 22000) return "Ultimate People Manager";
  if (score >= 13000) return "Culture Builder";
  if (score >= 7000) return "People Champion";
  if (score >= 2500) return "Thoughtful Manager";
  return "Needs Improvement";
}

export function makeEvent(type: EventType, employeeId: string, levelId: number, sequence: number): OfficeEvent {
  const duration = eventDuration(type, levelId);
  return {
    id: `${levelId}-${sequence}-${type}-${employeeId}`,
    type,
    employeeId,
    duration,
    remaining: duration,
    stage: type === "delivery" ? "pickup" : "active",
    selectedRewards: [],
  };
}
