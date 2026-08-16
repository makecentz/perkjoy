import type { Employee, EventType, LevelDefinition, RewardDefinition, RewardId } from "@/types/game";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const rewards: RewardDefinition[] = [
  { id: "card", label: "Birthday Card", icon: "✉", points: 50 },
  { id: "cake", label: "Celebration Cake", icon: "🎂", points: 100 },
  { id: "balloons", label: "Balloons", icon: "◉", points: 50 },
  { id: "gift-card", label: "Gift Card", icon: "$", points: 150 },
  { id: "flowers", label: "Flowers", icon: "✿", points: 100 },
  { id: "cookies", label: "Cookie Box", icon: "●", points: 90 },
  { id: "gift-box", label: "Local Gift Box", icon: "▣", points: 150 },
  { id: "badge", label: "Recognition Badge", icon: "★", points: 75 },
];

export const recommendedRewards: Record<EventType, RewardId[]> = {
  birthday: ["card", "cake", "balloons"],
  anniversary: ["gift-card", "flowers"],
  accomplishment: ["badge", "gift-card"],
  promotion: ["badge", "gift-box"],
  delivery: ["gift-box"],
};

export const eventLabels: Record<EventType, { label: string; icon: string; color: string; base: number }> = {
  birthday: { label: "Birthday", icon: "🎂", color: "#f36f55", base: 100 },
  anniversary: { label: "Anniversary", icon: "🎉", color: "#f0aa26", base: 125 },
  accomplishment: { label: "Great Work", icon: "🏆", color: "#397f57", base: 75 },
  promotion: { label: "Promotion", icon: "★", color: "#2768bb", base: 125 },
  delivery: { label: "Local Delivery", icon: "▣", color: "#0b5fa5", base: 150 },
};

export const employees: Employee[] = [
  { id: "alex", name: "Alex", character: "alex", position: { x: 250, y: 174 } },
  { id: "taylor", name: "Taylor", character: "taylor", position: { x: 514, y: 164 } },
  { id: "sam", name: "Sam", character: "sam", position: { x: 716, y: 188 } },
  { id: "casey", name: "Casey", character: "alex", position: { x: 260, y: 390 } },
  { id: "morgan", name: "Morgan", character: "taylor", position: { x: 500, y: 366 } },
  { id: "jamie", name: "Jamie", character: "sam", position: { x: 716, y: 380 } },
  { id: "priya", name: "Priya", character: "taylor", position: { x: 835, y: 296 } },
  { id: "devon", name: "Devon", character: "alex", position: { x: 390, y: 278 } },
];

export const levels: LevelDefinition[] = [
  { id: 1, name: "First Day", instruction: "Help Sam celebrate Alex's birthday, then keep the good work going.", duration: 120, employeeIds: ["alex", "taylor", "sam"], eventTypes: ["birthday"], spawnEvery: 17, simultaneous: 1, targetCelebrations: 5 },
  { id: 2, name: "Growing Team", instruction: "Birthdays and everyday wins can happen at the same time.", duration: 135, employeeIds: ["alex", "taylor", "sam", "casey", "morgan", "jamie"], eventTypes: ["birthday", "accomplishment"], spawnEvery: 13, simultaneous: 2, targetCelebrations: 8 },
  { id: 3, name: "Milestone Madness", instruction: "Prioritize birthdays, accomplishments, and work anniversaries.", duration: 150, employeeIds: employees.slice(0, 8).map((employee) => employee.id), eventTypes: ["birthday", "anniversary", "accomplishment", "promotion"], spawnEvery: 11, simultaneous: 3, targetCelebrations: 11 },
  { id: 4, name: "Delivery Rush", instruction: "Meet Riley at reception, then bring each PerkJoy Local order to the right person.", duration: 150, employeeIds: employees.slice(0, 8).map((employee) => employee.id), eventTypes: ["birthday", "anniversary", "delivery"], spawnEvery: 10, simultaneous: 3, targetCelebrations: 12 },
  { id: 5, name: "Monday Madness", instruction: "Everything is happening. Use PerkJoy Automation when the office gets hectic.", duration: 165, employeeIds: employees.slice(0, 8).map((employee) => employee.id), eventTypes: ["birthday", "anniversary", "accomplishment", "promotion", "delivery"], spawnEvery: 8, simultaneous: 4, targetCelebrations: 15 },
];

export const endlessLevel: LevelDefinition = {
  id: 6,
  name: "Office Rush",
  instruction: "Endless mode: keep morale alive as the moments arrive faster and faster.",
  duration: 9999,
  employeeIds: employees.map((employee) => employee.id),
  eventTypes: ["birthday", "anniversary", "accomplishment", "promotion", "delivery"],
  spawnEvery: 7,
  simultaneous: 5,
  targetCelebrations: 999,
};

export const characterCrops = {
  alex: { sx: 198, sy: 105, sw: 92, sh: 224 },
  taylor: { sx: 198, sy: 336, sw: 92, sh: 182 },
  jordan: { sx: 198, sy: 514, sw: 92, sh: 190 },
  riley: { sx: 198, sy: 699, sw: 98, sh: 169 },
  sam: { sx: 198, sy: 866, sw: 98, sh: 157 },
} as const;
