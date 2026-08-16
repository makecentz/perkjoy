"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, Award, Check, ChevronRight, Clipboard, Gamepad2,
  Gift, Heart, Info, Maximize2, Music2, Pause, Play, RotateCcw,
  Share2, Sparkles, Trophy, Volume2, VolumeX, Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { OfficeRushAudio } from "@/lib/game/audio";
import { trackGameEvent } from "@/lib/game/analytics";
import { deliveryDoorPosition, employeeWalkPoints, employees, endlessLevel, eventLabels, levels, officeColliders, PLAYER_RADIUS, recommendedRewards, rewards } from "@/lib/game/config";
import { celebrationResult, clamp, distance, makeEvent, moveWithOfficeCollisions, rankForScore } from "@/lib/game/simulation";
import { defaultAudio, defaultScores, loadAudio, loadScores, saveAudio, saveScores } from "@/lib/game/storage";
import type { AudioPreferences, GameMode, GameStats, HighScores, LevelDefinition, OfficeEvent, PlayerAction, Position, RewardId } from "@/types/game";
import { GameCanvas } from "./GameCanvas";
import styles from "./office-rush.module.css";

const initialStats: GameStats = { score: 0, morale: 100, celebrated: 0, missed: 0, bestCombo: 1, combo: 1 };
const startPosition = { x: 570, y: 300 };

function createEmployeePositions() {
  return Object.fromEntries(employees.map((employee) => [employee.id, { ...employee.position }])) as Record<string, Position>;
}

function formatTime(total: number) {
  const seconds = Math.max(0, Math.ceil(total));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function OfficeRushGame() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [levelIndex, setLevelIndex] = useState(0);
  const [endless, setEndless] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(levels[0].duration);
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [player, setPlayer] = useState<Position>(startPosition);
  const [employeePositions, setEmployeePositions] = useState<Record<string, Position>>(createEmployeePositions);
  const [playerAction, setPlayerAction] = useState<PlayerAction>("idle");
  const [playerFacing, setPlayerFacing] = useState<-1 | 1>(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedRewards, setSelectedRewards] = useState<RewardId[]>([]);
  const [inventory, setInventory] = useState<RewardId | null>(null);
  const [automationCharge, setAutomationCharge] = useState(0);
  const [automationSeconds, setAutomationSeconds] = useState(0);
  const [feedback, setFeedback] = useState<{ label: string; x: number; y: number; perfect: boolean } | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [highScores, setHighScores] = useState<HighScores>(defaultScores);
  const [audioSettings, setAudioSettings] = useState<AudioPreferences>(defaultAudio);
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [shareMessage, setShareMessage] = useState("");
  const keyState = useRef(new Set<string>());
  const eventsRef = useRef<OfficeEvent[]>([]);
  const employeePositionsRef = useRef<Record<string, Position>>(createEmployeePositions());
  const employeeWaypointRef = useRef<Record<string, number>>(Object.fromEntries(employees.map((employee, index) => [employee.id, (index + 1) % employeeWalkPoints.length])));
  const joystickVector = useRef({ x: 0, y: 0 });
  const joystickPointer = useRef<number | null>(null);
  const spawnAccumulator = useRef(0);
  const sequence = useRef(0);
  const playerActionRef = useRef<PlayerAction>("idle");
  const playerFacingRef = useRef<-1 | 1>(1);
  const actionTimer = useRef<number | null>(null);
  const interactHandlerRef = useRef<() => void>(() => undefined);
  const quickRewardHandlerRef = useRef<() => void>(() => undefined);
  const automationHandlerRef = useRef<() => void>(() => undefined);
  const audio = useRef<OfficeRushAudio | null>(null);
  const modeRef = useRef<GameMode>(mode);
  const level: LevelDefinition = endless ? endlessLevel : levels[levelIndex];
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const inventoryLabel = inventory ? rewards.find((reward) => reward.id === inventory)?.label ?? "delivery" : null;
  useEffect(() => {
    const scores = loadScores();
    const settings = loadAudio();
    audio.current = new OfficeRushAudio(settings);
    trackGameEvent("game_page_view");
    const hydrate = window.setTimeout(() => {
      setHighScores(scores);
      setAudioSettings(settings);
    }, 0);
    return () => {
      window.clearTimeout(hydrate);
      if (actionTimer.current !== null) window.clearTimeout(actionTimer.current);
      audio.current?.destroy();
    };
  }, []);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { audio.current?.update(audioSettings); saveAudio(audioSettings); }, [audioSettings]);

  const persistScores = useCallback((partial: Partial<HighScores>) => {
    const saved = saveScores(partial);
    setHighScores(saved);
  }, []);

  const updatePlayerAction = useCallback((action: PlayerAction) => {
    if (playerActionRef.current === action) return;
    playerActionRef.current = action;
    setPlayerAction(action);
  }, []);

  const resetInput = useCallback(() => {
    keyState.current.clear();
    joystickPointer.current = null;
    joystickVector.current = { x: 0, y: 0 };
    setJoystick({ x: 0, y: 0 });
    if (playerActionRef.current === "walk") updatePlayerAction("idle");
  }, [updatePlayerAction]);

  const playPlayerAction = useCallback((action: Extract<PlayerAction, "grab" | "give">) => {
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current);
    updatePlayerAction(action);
    actionTimer.current = window.setTimeout(() => {
      updatePlayerAction("idle");
      actionTimer.current = null;
    }, 680);
  }, [updatePlayerAction]);

  const startLevel = useCallback(async (index = levelIndex, isEndless = endless) => {
    const nextLevel = isEndless ? endlessLevel : levels[index];
    await audio.current?.unlock();
    audio.current?.startMusic();
    audio.current?.effect("click");
    setLevelIndex(index);
    setEndless(isEndless);
    setStats(initialStats);
    eventsRef.current = [];
    setEvents([]);
    setPlayer(startPosition);
    const nextEmployeePositions = createEmployeePositions();
    employeePositionsRef.current = nextEmployeePositions;
    setEmployeePositions(nextEmployeePositions);
    employeeWaypointRef.current = Object.fromEntries(employees.map((employee, employeeIndex) => [employee.id, (employeeIndex + 1) % employeeWalkPoints.length]));
    resetInput();
    playerFacingRef.current = 1;
    setPlayerFacing(1);
    updatePlayerAction("idle");
    setTimeRemaining(nextLevel.duration);
    setSelectedEventId(null);
    setSelectedRewards([]);
    setInventory(null);
    setAutomationCharge(0);
    setAutomationSeconds(0);
    setFeedback(null);
    setTutorialStep(nextLevel.id === 1 ? 1 : 0);
    spawnAccumulator.current = nextLevel.spawnEvery;
    sequence.current = 0;
    setMode("playing");
    trackGameEvent("level_started", { level: nextLevel.id, endless: isEndless });
  }, [endless, levelIndex, resetInput, updatePlayerAction]);

  const openLevel = useCallback((index: number, isEndless = false) => {
    setLevelIndex(index);
    setEndless(isEndless);
    setMode("level-intro");
    audio.current?.effect("click");
  }, []);

  const rewardPosition = useCallback((event: OfficeEvent) => {
    if (event.stage === "pickup") return deliveryDoorPosition;
    return employeePositionsRef.current[event.employeeId] ?? { x: 480, y: 270 };
  }, []);

  const completeEvent = useCallback((eventId: string, chosen: RewardId[]) => {
    const event = eventsRef.current.find((item) => item.id === eventId);
    if (!event) return;
    if (event.stage === "pickup") {
      playPlayerAction("grab");
      const next = eventsRef.current.map((item) => item.id === eventId ? { ...item, stage: "deliver" as const, remaining: Math.max(item.remaining, 18) } : item);
      eventsRef.current = next;
      setEvents(next);
      setInventory(event.deliveryReward ?? "card");
      setFeedback({ label: "DELIVERY PICKED UP — HURRY!", x: deliveryDoorPosition.x, y: deliveryDoorPosition.y, perfect: false });
      setTimeout(() => setFeedback(null), 1100);
      audio.current?.effect("delivery");
      setSelectedEventId(null);
      return;
    }
    const result = celebrationResult(event, chosen.length ? chosen : recommendedRewards[event.type].slice(0, 1));
    playPlayerAction("give");
    const position = rewardPosition(event);
    const nextEvents = eventsRef.current.filter((item) => item.id !== eventId);
    eventsRef.current = nextEvents;
    setEvents(nextEvents);
    setStats((current) => ({
      ...current,
      score: current.score + result.score,
      morale: clamp(current.morale + result.morale, 0, 100),
      celebrated: current.celebrated + 1,
      combo: result.combo,
      bestCombo: Math.max(current.bestCombo, result.combo),
    }));
    setAutomationCharge((current) => clamp(current + (result.perfect ? 35 : 24), 0, 100));
    setInventory(null);
    setSelectedEventId(null);
    setSelectedRewards([]);
    setFeedback({ label: result.label, x: position.x, y: position.y, perfect: result.perfect });
    setTimeout(() => setFeedback(null), result.perfect ? 1700 : 1100);
    audio.current?.effect(event.type === "birthday" ? "birthday" : "success");
    setTutorialStep((step) => step > 0 ? Math.min(4, step + 1) : step);
  }, [playPlayerAction, rewardPosition]);

  const interact = useCallback(() => {
    if (modeRef.current !== "playing") return;
    const nearby = events
      .map((event) => ({ event, distance: distance(player, rewardPosition(event)) }))
      .filter((item) => item.distance <= 92)
      .sort((a, b) => a.distance - b.distance)[0]?.event;
    if (!nearby) {
      setFeedback({ label: "MOVE CLOSER TO A MOMENT", x: player.x, y: player.y, perfect: false });
      setTimeout(() => setFeedback(null), 750);
      return;
    }
    if (nearby.stage === "pickup") completeEvent(nearby.id, []);
    else if (nearby.stage === "deliver") completeEvent(nearby.id, [nearby.deliveryReward ?? "card"]);
    else {
      setSelectedEventId(nearby.id);
      setSelectedRewards([]);
      audio.current?.effect("click");
      if (tutorialStep === 1) setTutorialStep(2);
    }
  }, [completeEvent, events, player, rewardPosition, tutorialStep]);

  const quickReward = useCallback(() => {
    if (selectedEvent) {
      completeEvent(selectedEvent.id, selectedRewards.length ? selectedRewards : recommendedRewards[selectedEvent.type].slice(0, 1));
      return;
    }
    const nearby = events
      .map((event) => ({ event, distance: distance(player, rewardPosition(event)) }))
      .filter((item) => item.distance <= 92 && item.event.stage !== "pickup")
      .sort((a, b) => a.distance - b.distance)[0]?.event;
    if (nearby) completeEvent(nearby.id, nearby.stage === "deliver" ? [nearby.deliveryReward ?? "card"] : recommendedRewards[nearby.type].slice(0, 1));
    else interact();
  }, [completeEvent, events, interact, player, rewardPosition, selectedEvent, selectedRewards]);

  const activateAutomation = useCallback(() => {
    if (automationCharge < 100 || automationSeconds > 0 || modeRef.current !== "playing") return;
    setAutomationCharge(0);
    setAutomationSeconds(15);
    setFeedback({ label: "APPRECIATION ON AUTOPILOT!", x: 480, y: 210, perfect: true });
    setTimeout(() => setFeedback(null), 1700);
    audio.current?.effect("automation");
    trackGameEvent("automation_powerup_used", { level: level.id });
  }, [automationCharge, automationSeconds, level.id]);

  useEffect(() => {
    interactHandlerRef.current = interact;
    quickRewardHandlerRef.current = quickReward;
    automationHandlerRef.current = activateAutomation;
  }, [activateAutomation, interact, quickReward]);

  useEffect(() => {
    const movementKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !event.repeat) {
        resetInput();
        setMode((current) => current === "playing" ? "paused" : current === "paused" ? "playing" : current);
        return;
      }
      if (modeRef.current !== "playing") return;
      if (movementKeys.has(key)) {
        event.preventDefault();
        keyState.current.add(key);
      }
      if (event.key === " " && !event.repeat) { event.preventDefault(); interactHandlerRef.current(); }
      if (key === "e" && !event.repeat) quickRewardHandlerRef.current();
      if (key === "q" && !event.repeat) automationHandlerRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => keyState.current.delete(event.key.toLowerCase());
    const onBlur = () => resetInput();
    const onVisibility = () => {
      resetInput();
      if (document.hidden && modeRef.current === "playing") setMode("paused");
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [resetInput]);

  useEffect(() => {
    if (mode === "playing") return;
    const timer = window.setTimeout(resetInput, 0);
    return () => window.clearTimeout(timer);
  }, [mode, resetInput]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const move = (now: number) => {
      const delta = Math.min(.04, (now - previous) / 1000);
      previous = now;
      if (modeRef.current === "playing" && !selectedEventId) {
        const keys = keyState.current;
        let x = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0) + joystickVector.current.x;
        let y = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0) + joystickVector.current.y;
        const length = Math.hypot(x, y);
        if (length > 0) {
          x /= Math.max(1, length); y /= Math.max(1, length);
          updatePlayerAction("walk");
          if (x !== 0) {
            const facing = x < 0 ? -1 : 1;
            if (playerFacingRef.current !== facing) {
              playerFacingRef.current = facing;
              setPlayerFacing(facing);
            }
          }
          setPlayer((current) => moveWithOfficeCollisions(current, { x: x * 188 * delta, y: y * 188 * delta }, officeColliders, PLAYER_RADIUS));
        } else if (playerActionRef.current === "walk") updatePlayerAction("idle");
      }
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [selectedEventId, updatePlayerAction]);

  useEffect(() => {
    if (mode !== "playing") return;
    let frame = 0;
    let previous = performance.now();
    let lastPublished = 0;
    const walkEmployees = (now: number) => {
      const delta = Math.min(.05, (now - previous) / 1000);
      previous = now;
      const next = { ...employeePositionsRef.current };
      level.employeeIds.forEach((employeeId, index) => {
        const current = next[employeeId] ?? employeeWalkPoints[index % employeeWalkPoints.length];
        let waypointIndex = employeeWaypointRef.current[employeeId] ?? (index + 1) % employeeWalkPoints.length;
        let target = employeeWalkPoints[waypointIndex];
        let gap = distance(current, target);
        if (gap < 8) {
          waypointIndex = (waypointIndex + 1) % employeeWalkPoints.length;
          employeeWaypointRef.current[employeeId] = waypointIndex;
          target = employeeWalkPoints[waypointIndex];
          gap = distance(current, target);
        }
        if (gap > 0) {
          const speed = 22 + (index % 3) * 3;
          const moved = moveWithOfficeCollisions(current, {
            x: ((target.x - current.x) / gap) * speed * delta,
            y: ((target.y - current.y) / gap) * speed * delta,
          }, officeColliders, 12);
          if (distance(current, moved) < .05) employeeWaypointRef.current[employeeId] = (waypointIndex + 1) % employeeWalkPoints.length;
          next[employeeId] = moved;
        }
      });
      employeePositionsRef.current = next;
      if (now - lastPublished >= 55) {
        setEmployeePositions({ ...next });
        lastPublished = now;
      }
      frame = requestAnimationFrame(walkEmployees);
    };
    frame = requestAnimationFrame(walkEmployees);
    return () => cancelAnimationFrame(frame);
  }, [level, mode]);

  useEffect(() => {
    if (mode !== "playing") return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(.3, (now - previous) / 1000);
      previous = now;
      setTimeRemaining((current) => current - delta);
      setAutomationSeconds((current) => Math.max(0, current - delta));
      spawnAccumulator.current += delta;
      let next = eventsRef.current.map((event) => ({ ...event, remaining: event.remaining - delta }));
      const expired = next.filter((event) => event.remaining <= 0);
      if (expired.length) {
        next = next.filter((event) => event.remaining > 0);
        setStats((currentStats) => ({ ...currentStats, morale: clamp(currentStats.morale - expired.length * 14, 0, 100), missed: currentStats.missed + expired.length, combo: 1 }));
        if (expired.some((event) => event.stage === "deliver")) setInventory(null);
        audio.current?.effect("morale-down");
      }
      if (spawnAccumulator.current >= level.spawnEvery && next.length < level.simultaneous) {
        spawnAccumulator.current = 0;
        sequence.current += 1;
        const queuedType = level.id === 1 && sequence.current === 1 ? "birthday" : level.eventTypes[(sequence.current - 1) % level.eventTypes.length];
        const type = queuedType === "delivery" && next.some((event) => event.type === "delivery")
          ? level.eventTypes.find((eventType) => eventType !== "delivery") ?? queuedType
          : queuedType;
        const available = level.employeeIds.filter((id) => !next.some((event) => event.employeeId === id));
        const employeeId = level.id === 1 && sequence.current === 1 ? "alex" : available[sequence.current % Math.max(1, available.length)] ?? level.employeeIds[0];
        next.push(makeEvent(type, employeeId, level.id, sequence.current));
        if (type === "delivery") audio.current?.effect("delivery");
      }
      eventsRef.current = next;
      setEvents(next);
    }, 100);
    return () => window.clearInterval(timer);
  }, [level, mode]);

  useEffect(() => {
    if (mode !== "playing" || automationSeconds <= 0 || !events.length) return;
    const event = events.find((item) => item.stage !== "pickup") ?? events[0];
    const timer = window.setTimeout(() => {
      if (event.stage === "pickup") completeEvent(event.id, []);
      else completeEvent(event.id, recommendedRewards[event.type]);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [automationSeconds, completeEvent, events, mode]);

  const finishLevel = useCallback((failed = false) => {
    const bonus = !failed && stats.missed === 0 ? 1000 : 0;
    const finalScore = stats.score + bonus;
    setStats((current) => ({ ...current, score: finalScore }));
    const unlock = !failed && !endless && level.id === 5;
    persistScores({ highestScore: finalScore, bestEndlessRun: endless ? finalScore : 0, highestMorale: stats.morale, mostCelebrated: stats.celebrated, unlockedEndless: unlock });
    setMode(failed ? "game-over" : "level-complete");
    audio.current?.effect(failed ? "game-over" : "level-complete");
    trackGameEvent(failed ? "game_over" : "level_completed", { level: level.id, score: finalScore, morale: stats.morale });
  }, [endless, level.id, persistScores, stats]);

  useEffect(() => {
    if (mode !== "playing") return;
    if (stats.morale > 0 && (endless || timeRemaining > 0)) return;
    const timer = window.setTimeout(() => finishLevel(stats.morale <= 0), 0);
    return () => window.clearTimeout(timer);
  }, [endless, finishLevel, mode, stats.morale, timeRemaining]);

  function toggleReward(id: RewardId) {
    setSelectedRewards((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    audio.current?.effect("click");
  }

  function updateJoystick(event: ReactPointerEvent<HTMLDivElement>) {
    if (joystickPointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    let y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    joystickVector.current = { x, y };
    setJoystick({ x, y });
  }

  function beginJoystick(event: ReactPointerEvent<HTMLDivElement>) {
    joystickPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event);
  }

  function endJoystick() {
    joystickPointer.current = null;
    joystickVector.current = { x: 0, y: 0 };
    setJoystick({ x: 0, y: 0 });
  }

  async function shareScore() {
    const text = `I scored ${stats.score.toLocaleString()} in PerkJoy: Office Rush. Think you can beat me?`;
    const data = { title: "PerkJoy: Office Rush", text, url: `${location.origin}/game` };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(`${text} ${data.url}`); setShareMessage("Game link copied"); }
      trackGameEvent("score_shared", { score: stats.score });
    } catch { setShareMessage("Sharing was canceled"); }
    setTimeout(() => setShareMessage(""), 1800);
  }

  async function enterFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  const setting = <K extends keyof AudioPreferences>(key: K, value: AudioPreferences[K]) => setAudioSettings((current) => ({ ...current, [key]: value }));

  if (mode === "menu" || mode === "how-to" || mode === "high-scores") return (
    <main className={styles.gamePage}>
      <div className={styles.rotateScreen}><RotateCcw /><h1>Rotate Your Phone</h1><p>PerkJoy: Office Rush is best played in landscape mode.</p></div>
      <div className={styles.menuBackdrop}>
        <nav><Link href="/"><Logo /></Link><Link href="/"><ArrowLeft /> Back to PerkJoy</Link></nav>
        <section className={styles.startCard}>
          <div className={styles.startCopy}><span><Sparkles /> A PERKJOY BROWSER GAME</span><h1><small>PERKJOY:</small> OFFICE RUSH</h1><p>Can you keep your team feeling appreciated?</p></div>
          <div className={styles.menuButtons}>
            <button className="button button-primary" onClick={() => openLevel(0)}><Play /> Play</button>
            <button className="button button-secondary" onClick={() => setMode("how-to")}><Info /> How to Play</button>
            <button className="button button-secondary" onClick={() => setMode("high-scores")}><Trophy /> High Scores</button>
            {highScores.unlockedEndless && <button className={styles.endlessButton} onClick={() => openLevel(0, true)}><Zap /> Office Rush — Endless</button>}
          </div>
          {mode === "how-to" && <aside className={styles.menuPanel}><button aria-label="Close how to play" onClick={() => setMode("menu")}>×</button><Gamepad2 /><h2>Keep the moments moving.</h2><ol><li><b>Move</b><span>WASD, arrow keys, or the touch joystick.</span></li><li><b>Interact</b><span>Press Space or INTERACT near a moving employee.</span></li><li><b>Deliver</b><span>Meet Riley at the door, collect the item, then catch the employee.</span></li><li><b>Automate</b><span>Fill the lightning meter, then press Q to put appreciation on autopilot.</span></li></ol></aside>}
          {mode === "high-scores" && <aside className={styles.menuPanel}><button aria-label="Close high scores" onClick={() => setMode("menu")}>×</button><Award /><h2>Your office records</h2><dl><div><dt>Highest score</dt><dd>{highScores.highestScore.toLocaleString()}</dd></div><div><dt>Best endless run</dt><dd>{highScores.bestEndlessRun.toLocaleString()}</dd></div><div><dt>Highest morale</dt><dd>{highScores.highestMorale}%</dd></div><div><dt>Employees celebrated</dt><dd>{highScores.mostCelebrated}</dd></div></dl></aside>}
        </section>
        <small className={styles.menuFoot}>Free browser game · No download required</small>
      </div>
    </main>
  );

  if (mode === "level-intro") return (
    <main className={styles.gamePage}>
      <div className={styles.rotateScreen}><RotateCcw /><h1>Rotate Your Phone</h1><p>PerkJoy: Office Rush is best played in landscape mode.</p></div>
      <section className={styles.levelIntro}><span>{endless ? "ENDLESS MODE" : `LEVEL ${level.id}`}</span><h1>{level.name}</h1><p>{level.instruction}</p><button className="button button-primary button-large" onClick={() => void startLevel(levelIndex, endless)}>Start <ChevronRight /></button><button onClick={() => setMode("menu")}>Back to game menu</button></section>
    </main>
  );

  const completion = mode === "level-complete" || mode === "game-over";
  return (
    <main className={styles.gamePage}>
      <div className={styles.rotateScreen}><RotateCcw /><h1>Rotate Your Phone</h1><p>PerkJoy: Office Rush is best played in landscape mode.</p></div>
      <div className={styles.gameShell}>
        <header className={styles.hud}>
          <div className={styles.hudBrand}><Logo /><span><small>{endless ? "OFFICE RUSH" : `LEVEL ${level.id}`}</small><b>{level.name}</b></span></div>
          <div className={styles.morale}><span><Heart /> Team Morale</span><i><b style={{ width: `${stats.morale}%` }} /></i><strong>{Math.round(stats.morale)}%</strong></div>
          <div className={styles.hudMetric}><small>TIME</small><b className={timeRemaining < 15 ? styles.warning : ""}>{endless ? formatTime(stats.celebrated * 8 + (level.duration - timeRemaining)) : formatTime(timeRemaining)}</b></div>
          <div className={styles.hudMetric}><small>SCORE</small><b>{stats.score.toLocaleString()}</b></div>
          <button className={styles.pauseButton} aria-label="Pause game" onClick={() => setMode("paused")}><Pause /></button>
        </header>

        <section className={styles.canvasWrap}>
          <GameCanvas activeEmployeeIds={level.employeeIds} automationSeconds={automationSeconds} employeePositions={employeePositions} events={events} feedback={feedback} inventory={inventory} player={player} playerAction={playerAction} playerFacing={playerFacing} reducedMotion={audioSettings.reducedMotion} />
          <div className={styles.objectiveBar}><span><b>{events.length}</b> active moment{events.length === 1 ? "" : "s"}</span><span>{inventory ? <><Gift /> Deliver the {inventoryLabel}</> : <><Sparkles /> Catch an employee or meet Riley at the door</>}</span></div>
          {tutorialStep > 0 && tutorialStep < 4 && <div className={styles.tutorial}><span>SAM&apos;S TIP</span><b>{tutorialStep === 1 ? "Move Jordan to Alex." : tutorialStep === 2 ? "Choose birthday rewards." : "Deliver it before time runs out."}</b></div>}

          <button className={`${styles.automation} ${automationCharge >= 100 ? styles.ready : ""}`} onClick={activateAutomation} disabled={automationCharge < 100 || automationSeconds > 0}><Zap /><span><small>{automationSeconds > 0 ? "AUTOMATION ACTIVE" : "PERKJOY AUTOMATION"}</small><b>{automationSeconds > 0 ? `${Math.ceil(automationSeconds)}s remaining` : automationCharge >= 100 ? "Activate autopilot" : `${Math.round(automationCharge)}% charged`}</b></span><i><em style={{ width: `${automationSeconds > 0 ? 100 : automationCharge}%` }} /></i></button>

          <div className={styles.touchControls}>
            <div className={styles.joystick} onPointerDown={beginJoystick} onPointerMove={updateJoystick} onPointerUp={endJoystick} onPointerCancel={endJoystick} onLostPointerCapture={endJoystick}><i style={{ transform: `translate(${joystick.x * 28}px, ${joystick.y * 28}px)` }} /></div>
            <div><button onPointerDown={(event) => { event.preventDefault(); interact(); }}><Check />Interact</button><button onPointerDown={(event) => { event.preventDefault(); quickReward(); }}><Gift />Reward</button></div>
          </div>
        </section>

        <footer className={styles.gameFooter}><span><b>Move</b> WASD / Arrow Keys</span><span><b>Interact</b> Space</span><span><b>Quick Reward</b> E</span><span><b>Automation</b> Q</span><button onClick={() => void enterFullscreen()}><Maximize2 /> Enter Fullscreen</button></footer>

        {selectedEvent && <div className={styles.rewardOverlay}><section><header><span style={{ background: eventLabels[selectedEvent.type].color }}>{eventLabels[selectedEvent.type].icon}</span><div><small>{employees.find((employee) => employee.id === selectedEvent.employeeId)?.name}</small><h2>{selectedEvent.stage === "deliver" ? "Complete the local delivery" : `Choose a ${eventLabels[selectedEvent.type].label.toLowerCase()} reward`}</h2></div><b>{Math.ceil(selectedEvent.remaining)}s</b></header><div className={styles.rewardGrid}>{rewards.filter((reward) => selectedEvent.stage === "deliver" ? reward.id === selectedEvent.deliveryReward : recommendedRewards[selectedEvent.type].includes(reward.id) || reward.id === "gift-card").map((reward) => <button key={reward.id} className={selectedRewards.includes(reward.id) ? styles.selected : ""} onClick={() => toggleReward(reward.id)}><span>{reward.icon}</span><b>{reward.label}</b><small>+{reward.points} points</small></button>)}</div><footer><button className="button button-ghost" onClick={() => setSelectedEventId(null)}>Keep moving</button><button className="button button-primary" disabled={!selectedRewards.length} onClick={() => completeEvent(selectedEvent.id, selectedRewards)}>Celebrate <Sparkles /></button></footer></section></div>}

        {mode === "paused" && <div className={styles.pauseOverlay}><section><Pause /><h2>Office paused</h2><button className="button button-primary" onClick={() => setMode("playing")}><Play /> Resume</button><button className="button button-secondary" onClick={() => void startLevel(levelIndex, endless)}><RotateCcw /> Restart level</button><div className={styles.audioSettings}><label><span><Music2 /> Music</span><input type="range" min="0" max="1" step=".05" value={audioSettings.musicVolume} onChange={(event) => setting("musicVolume", Number(event.target.value))} /></label><label><span><Volume2 /> Sound effects</span><input type="range" min="0" max="1" step=".05" value={audioSettings.soundVolume} onChange={(event) => setting("soundVolume", Number(event.target.value))} /></label><button onClick={() => setting("musicEnabled", !audioSettings.musicEnabled)}>{audioSettings.musicEnabled ? <Music2 /> : <VolumeX />} Music {audioSettings.musicEnabled ? "On" : "Off"}</button><button onClick={() => setting("soundEnabled", !audioSettings.soundEnabled)}>{audioSettings.soundEnabled ? <Volume2 /> : <VolumeX />} Sound {audioSettings.soundEnabled ? "On" : "Off"}</button><label className={styles.motionSetting}><input type="checkbox" checked={audioSettings.reducedMotion} onChange={(event) => setting("reducedMotion", event.target.checked)} /> Reduce motion</label></div><button className={styles.quitButton} onClick={() => setMode("menu")}>Quit to game menu</button></section></div>}

        {completion && <div className={styles.completeOverlay}><section><span>{mode === "game-over" ? "OFFICE MORALE CRASHED" : endless ? "OFFICE RUSH COMPLETE" : "LEVEL COMPLETE"}</span><h2>{mode === "game-over" ? "Too many important moments were missed." : rankForScore(stats.score)}</h2><div><article><small>Score</small><b>{stats.score.toLocaleString()}</b></article><article><small>Employees Celebrated</small><b>{stats.celebrated}</b></article><article><small>Moments Missed</small><b>{stats.missed}</b></article><article><small>Morale</small><b>{Math.round(stats.morale)}%</b></article><article><small>Best Combo</small><b>x{stats.bestCombo}</b></article></div><footer>{mode === "game-over" ? <button className="button button-primary" onClick={() => void startLevel(levelIndex, endless)}><RotateCcw /> Try Again</button> : !endless && level.id < 5 ? <button className="button button-primary" onClick={() => openLevel(levelIndex + 1)}><ChevronRight /> Next Level</button> : <button className="button button-primary" onClick={() => openLevel(0, true)}><Zap /> Play Endless Mode</button>}<button className="button button-secondary" onClick={() => void startLevel(levelIndex, endless)}>Replay</button><button className="button button-secondary" onClick={() => void shareScore()}><Share2 /> Share Score</button></footer>{shareMessage && <p className={styles.shareMessage}><Clipboard /> {shareMessage}</p>}{!endless && level.id === 5 && <aside className={styles.businessCta}><small>RUNNING A REAL TEAM?</small><b>Don&apos;t play the employee appreciation game in real life.</b><p>Let PerkJoy remember for you.</p><Link href="/#how" onClick={() => trackGameEvent("business_cta_clicked")} className="button button-dark">See How PerkJoy Works</Link></aside>}<button className={styles.menuReturn} onClick={() => setMode("menu")}>Back to game menu</button></section></div>}
      </div>
    </main>
  );
}
