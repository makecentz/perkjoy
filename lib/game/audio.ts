import type { AudioPreferences } from "@/types/game";

type SoundName = "click" | "success" | "birthday" | "reward" | "morale-up" | "morale-down" | "timer" | "delivery" | "automation" | "level-complete" | "game-over";

export class OfficeRushAudio {
  private context: AudioContext | null = null;
  private musicTimer: number | null = null;
  private beat = 0;
  private settings: AudioPreferences;

  constructor(settings: AudioPreferences) { this.settings = settings; }

  update(settings: AudioPreferences) {
    this.settings = settings;
    if (!settings.musicEnabled) this.stopMusic();
  }

  async unlock() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }

  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = "sine", offset = 0) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + offset;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .015);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  effect(name: SoundName) {
    if (!this.settings.soundEnabled || !this.context) return;
    const volume = this.settings.soundVolume * .12;
    const patterns: Record<SoundName, Array<[number, number, number, OscillatorType?]>> = {
      click: [[420, .07, 0]],
      success: [[523, .15, 0], [659, .16, .1], [784, .22, .2]],
      birthday: [[523, .12, 0], [523, .12, .13], [659, .15, .26], [523, .2, .4]],
      reward: [[440, .1, 0], [880, .18, .09]],
      "morale-up": [[392, .12, 0], [587, .2, .1]],
      "morale-down": [[330, .16, 0], [220, .25, .12]],
      timer: [[740, .08, 0], [740, .08, .13]],
      delivery: [[294, .12, 0], [392, .12, .11], [494, .2, .22]],
      automation: [[220, .15, 0], [440, .18, .08], [880, .35, .19]],
      "level-complete": [[392, .13, 0], [523, .13, .12], [659, .13, .24], [784, .3, .36]],
      "game-over": [[392, .2, 0], [311, .2, .18], [220, .4, .36]],
    };
    patterns[name].forEach(([frequency, duration, offset, type]) => this.tone(frequency, duration, volume, type ?? "triangle", offset));
  }

  startMusic() {
    if (!this.settings.musicEnabled || !this.context || this.musicTimer !== null) return;
    const playBeat = () => {
      if (!this.context || !this.settings.musicEnabled) return;
      const chord = [261.6, 329.6, 392, 293.7, 370, 440];
      const root = chord[(Math.floor(this.beat / 8) % 2) * 3];
      const note = chord[(this.beat % 8 < 4 ? 0 : 1) + (Math.floor(this.beat / 8) % 2) * 3];
      const volume = this.settings.musicVolume * .035;
      if (this.beat % 4 === 0) this.tone(root / 2, .38, volume * 1.4, "sine");
      this.tone(note, .2, volume, "triangle");
      if (this.beat % 2 === 1) this.tone(1100, .025, volume * .32, "square");
      this.beat += 1;
    };
    playBeat();
    this.musicTimer = window.setInterval(playBeat, 280);
  }

  stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  destroy() { this.stopMusic(); void this.context?.close(); this.context = null; }
}
