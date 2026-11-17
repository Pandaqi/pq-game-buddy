/** Synthesized cue sheet: no audio files, no network, unlocked on first tap. */

export type Cue = 'bell' | 'buzzer' | 'tick' | 'gong' | 'drumroll' | 'success' | 'click';

export interface AudioApi {
  unlock(): void;
  play(cue: Cue): void;
  setVolume(value: number): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

type Ctor = new () => AudioContext;

function audioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

class AudioService implements AudioApi {
  private ctx: AudioContext | null = null;
  private volume = 0.7;
  private muted = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = audioCtor();
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(cue: Cue): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    const level = this.volume * 0.5;
    switch (cue) {
      case 'bell':
        this.tone(ctx, 880, 1.1, 'sine', level);
        this.tone(ctx, 1320, 0.9, 'sine', level * 0.5);
        break;
      case 'buzzer':
        this.tone(ctx, 120, 0.45, 'square', level * 0.8);
        break;
      case 'tick':
        this.tone(ctx, 1000, 0.06, 'square', level * 0.4);
        break;
      case 'gong':
        this.tone(ctx, 140, 2, 'triangle', level);
        this.tone(ctx, 210, 1.6, 'sine', level * 0.4);
        break;
      case 'drumroll':
        for (let i = 0; i < 10; i += 1) {
          this.tone(ctx, 180 + (i % 2) * 40, 0.05, 'triangle', level * 0.5, i * 0.06);
        }
        break;
      case 'success':
        [523, 659, 784].forEach((freq, index) => {
          this.tone(ctx, freq, 0.22, 'sine', level * 0.7, index * 0.09);
        });
        break;
      case 'click':
      default:
        this.tone(ctx, 640, 0.04, 'sine', level * 0.3);
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    seconds: number,
    type: OscillatorType,
    level: number,
    delay = 0,
  ): void {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }
}

export const audio: AudioApi = new AudioService();
