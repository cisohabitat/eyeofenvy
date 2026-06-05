/**
 * Tiny Web Audio synth for SFX. We synthesize tones at runtime so the slice
 * ships with zero binary audio assets; real samples can replace these later
 * (e.g. via Howler) without touching call sites.
 */
export class Sound {
  private ctx?: AudioContext;

  /** Must be called from a user gesture (browsers block autoplay). */
  resume(): void {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private blip(freq: number, durMs: number, type: OscillatorType, gain = 0.15): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.connect(env).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durMs / 1000);
  }

  footstep(): void {
    this.blip(90, 90, 'triangle', 0.12);
  }
  bump(): void {
    this.blip(60, 130, 'square', 0.12);
  }
  hit(): void {
    this.blip(220, 110, 'sawtooth', 0.18);
    this.blip(140, 160, 'square', 0.1);
  }
  pickup(): void {
    this.blip(660, 80, 'sine', 0.16);
    this.blip(880, 120, 'sine', 0.14);
  }
  door(): void {
    this.blip(70, 320, 'sawtooth', 0.14);
  }
}
