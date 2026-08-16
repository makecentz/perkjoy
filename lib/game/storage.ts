import type { AudioPreferences, HighScores } from "@/types/game";

const SCORE_KEY = "perkjoy-office-rush-scores";
const AUDIO_KEY = "perkjoy-office-rush-audio";

export const defaultScores: HighScores = { highestScore: 0, bestEndlessRun: 0, highestMorale: 0, mostCelebrated: 0, unlockedEndless: false };
export const defaultAudio: AudioPreferences = { musicEnabled: true, soundEnabled: true, musicVolume: .34, soundVolume: .72, reducedMotion: false };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
  } catch {
    return fallback;
  }
}

export function loadScores() { return read(SCORE_KEY, defaultScores); }
export function loadAudio() { return read(AUDIO_KEY, defaultAudio); }
export function saveAudio(settings: AudioPreferences) { localStorage.setItem(AUDIO_KEY, JSON.stringify(settings)); }

export function saveScores(next: Partial<HighScores>) {
  const current = loadScores();
  const merged = {
    highestScore: Math.max(current.highestScore, next.highestScore ?? 0),
    bestEndlessRun: Math.max(current.bestEndlessRun, next.bestEndlessRun ?? 0),
    highestMorale: Math.max(current.highestMorale, next.highestMorale ?? 0),
    mostCelebrated: Math.max(current.mostCelebrated, next.mostCelebrated ?? 0),
    unlockedEndless: current.unlockedEndless || Boolean(next.unlockedEndless),
  };
  localStorage.setItem(SCORE_KEY, JSON.stringify(merged));
  return merged;
}
