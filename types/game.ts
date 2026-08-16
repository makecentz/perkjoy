export type CharacterId = "jordan" | "alex" | "taylor" | "sam" | "riley";
export type EventType = "birthday" | "anniversary" | "accomplishment" | "promotion" | "delivery";
export type RewardId = "card" | "cake" | "balloons" | "gift-card" | "flowers" | "cookies" | "gift-box" | "badge";
export type GameMode = "menu" | "how-to" | "high-scores" | "level-intro" | "playing" | "paused" | "level-complete" | "game-over";

export type Position = { x: number; y: number };

export type Employee = {
  id: string;
  name: string;
  character: CharacterId;
  position: Position;
};

export type RewardDefinition = {
  id: RewardId;
  label: string;
  icon: string;
  points: number;
};

export type OfficeEvent = {
  id: string;
  type: EventType;
  employeeId: string;
  duration: number;
  remaining: number;
  stage: "active" | "pickup" | "deliver";
  selectedRewards: RewardId[];
};

export type LevelDefinition = {
  id: number;
  name: string;
  instruction: string;
  duration: number;
  employeeIds: string[];
  eventTypes: EventType[];
  spawnEvery: number;
  simultaneous: number;
  targetCelebrations: number;
};

export type GameStats = {
  score: number;
  morale: number;
  celebrated: number;
  missed: number;
  bestCombo: number;
  combo: number;
};

export type HighScores = {
  highestScore: number;
  bestEndlessRun: number;
  highestMorale: number;
  mostCelebrated: number;
  unlockedEndless: boolean;
};

export type AudioPreferences = {
  musicEnabled: boolean;
  soundEnabled: boolean;
  musicVolume: number;
  soundVolume: number;
  reducedMotion: boolean;
};

export type CelebrationResult = {
  score: number;
  morale: number;
  combo: number;
  perfect: boolean;
  label: string;
};
