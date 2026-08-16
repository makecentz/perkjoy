import type { DeliveryReward, Employee, EventType, LevelDefinition, OfficeCollider, Position, RewardDefinition, RewardId } from "@/types/game";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const PLAYER_RADIUS = 17;
export const deliveryDoorPosition: Position = { x: 190, y: 214 };
export const deliveryRewards: DeliveryReward[] = ["balloons", "card", "cake"];

export const officeColliders: OfficeCollider[] = [
  { id: "reception-desk", x: 0, y: 88, width: 170, height: 98 },
  { id: "north-desk-1", x: 315, y: 70, width: 124, height: 82 },
  { id: "north-desk-2", x: 440, y: 70, width: 129, height: 82 },
  { id: "north-desk-3", x: 570, y: 70, width: 139, height: 84 },
  { id: "center-desk-1", x: 369, y: 151, width: 139, height: 91 },
  { id: "center-desk-2", x: 523, y: 151, width: 147, height: 91 },
  { id: "meeting-table", x: 776, y: 154, width: 151, height: 77 },
  { id: "manager-desk", x: 350, y: 345, width: 195, height: 83 },
  { id: "copier", x: 704, y: 330, width: 97, height: 103 },
  { id: "print-cabinet", x: 807, y: 344, width: 93, height: 77 },
];

export const employeeWalkPoints: Position[] = [
  { x: 205, y: 275 },
  { x: 320, y: 292 },
  { x: 485, y: 292 },
  { x: 680, y: 286 },
  { x: 686, y: 470 },
  { x: 570, y: 474 },
  { x: 305, y: 474 },
  { x: 210, y: 420 },
];

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
  delivery: ["balloons", "card", "cake"],
};

export const eventLabels: Record<EventType, { label: string; icon: string; color: string; base: number }> = {
  birthday: { label: "Birthday", icon: "🎂", color: "#f36f55", base: 100 },
  anniversary: { label: "Anniversary", icon: "🎉", color: "#f0aa26", base: 125 },
  accomplishment: { label: "Great Work", icon: "🏆", color: "#397f57", base: 75 },
  promotion: { label: "Promotion", icon: "★", color: "#2768bb", base: 125 },
  delivery: { label: "Local Delivery", icon: "▣", color: "#0b5fa5", base: 150 },
};

export const employees: Employee[] = [
  { id: "alex", name: "Alex", character: "alex", position: employeeWalkPoints[0] },
  { id: "taylor", name: "Taylor", character: "taylor", position: employeeWalkPoints[1] },
  { id: "sam", name: "Sam", character: "sam", position: employeeWalkPoints[2] },
  { id: "casey", name: "Casey", character: "alex", position: employeeWalkPoints[3] },
  { id: "morgan", name: "Morgan", character: "taylor", position: employeeWalkPoints[4] },
  { id: "jamie", name: "Jamie", character: "sam", position: employeeWalkPoints[5] },
  { id: "priya", name: "Priya", character: "taylor", position: employeeWalkPoints[6] },
  { id: "devon", name: "Devon", character: "alex", position: employeeWalkPoints[7] },
];

export const levels: LevelDefinition[] = [
  { id: 1, name: "First Day", instruction: "Catch moving teammates and meet Riley at the door when a delivery arrives.", duration: 120, employeeIds: ["alex", "taylor", "sam"], eventTypes: ["birthday", "delivery"], spawnEvery: 17, simultaneous: 1, targetCelebrations: 5 },
  { id: 2, name: "Growing Team", instruction: "Birthdays, deliveries, and everyday wins can happen at the same time.", duration: 135, employeeIds: ["alex", "taylor", "sam", "casey", "morgan", "jamie"], eventTypes: ["birthday", "delivery", "accomplishment"], spawnEvery: 13, simultaneous: 2, targetCelebrations: 8 },
  { id: 3, name: "Milestone Madness", instruction: "Prioritize moving teammates, deliveries, accomplishments, and work anniversaries.", duration: 150, employeeIds: employees.slice(0, 8).map((employee) => employee.id), eventTypes: ["birthday", "delivery", "anniversary", "accomplishment", "promotion"], spawnEvery: 11, simultaneous: 3, targetCelebrations: 11 },
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
