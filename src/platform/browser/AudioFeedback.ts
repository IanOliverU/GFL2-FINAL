import type { SimulationEvent } from '../../game';

export class AudioFeedback {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastEventId = 0;

  async resume(volume: number): Promise<void> {
    this.context ??= new AudioContext();
    this.master ??= this.context.createGain();
    this.master.connect(this.context.destination);
    this.setVolume(volume);
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setVolume(volume: number): void {
    if (this.master) this.master.gain.value = Math.min(1, Math.max(0, volume)) * 0.16;
  }

  process(events: readonly SimulationEvent[]): void {
    for (const event of events) {
      if (event.id <= this.lastEventId) continue;
      this.lastEventId = event.id;
      if (event.type === 'shot') this.tone(118, 0.035, 'square');
      else if (event.type === 'skill') {
        // Placeholder ability cue: Skill 1 / Skill 2 / Ultimate each get a
        // distinct pitch until approved audio assets exist.
        const pitch = event.value === 3 ? 523 : event.value === 2 ? 392 : 330;
        this.tone(pitch, event.value === 3 ? 0.22 : 0.12, 'triangle');
      } else if (event.type === 'critical') this.tone(620, 0.055, 'triangle');
      else if (event.type === 'playerDamaged') this.tone(74, 0.11, 'sawtooth');
      else if (event.type === 'bossBreak') this.tone(220, 0.22, 'sawtooth');
      else if (event.type === 'levelUp' || event.type === 'extractionComplete')
        this.tone(440, 0.18, 'sine');
    }
  }

  reset(): void {
    this.lastEventId = 0;
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  private tone(frequency: number, seconds: number, type: OscillatorType): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.7, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    oscillator.connect(envelope).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + seconds);
  }
}
