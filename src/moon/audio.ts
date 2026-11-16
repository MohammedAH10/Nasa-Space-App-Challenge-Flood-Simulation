export type MoonSound =
  | "click"
  | "fit"
  | "countdown"
  | "liftoff"
  | "stage"
  | "success"
  | "failure"
  | "badge";

class MoonAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(
        enabled ? 0.32 : 0,
        this.context.currentTime,
        0.02,
      );
    }
  }

  unlock(): void {
    const context = this.ensure();
    if (!context) return;
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
  }

  play(sound: MoonSound): void {
    if (!this.enabled) return;
    switch (sound) {
      case "click":
        this.tone(540, 0.07, "triangle", 0.12, 700);
        break;
      case "fit":
        this.tone(430, 0.12, "triangle", 0.14, 520);
        this.tone(660, 0.14, "sine", 0.11, 760, 0.07);
        break;
      case "countdown":
        this.tone(620, 0.14, "square", 0.1, 620);
        break;
      case "liftoff":
        this.noise(1.1, 0.22, 420);
        this.tone(95, 0.9, "sawtooth", 0.18, 46);
        break;
      case "stage":
        this.noise(0.34, 0.18, 900);
        this.tone(220, 0.3, "square", 0.12, 90);
        break;
      case "success":
        this.tone(523, 0.16, "triangle", 0.14, 523);
        this.tone(659, 0.16, "triangle", 0.14, 659, 0.13);
        this.tone(784, 0.18, "triangle", 0.14, 784, 0.26);
        this.tone(1046, 0.35, "sine", 0.16, 1046, 0.4);
        break;
      case "failure":
        this.tone(220, 0.24, "sawtooth", 0.12, 180);
        this.tone(146, 0.5, "sawtooth", 0.13, 82, 0.2);
        break;
      case "badge":
        this.tone(880, 0.12, "sine", 0.12, 880);
        this.tone(1174, 0.12, "sine", 0.12, 1174, 0.1);
        this.tone(1568, 0.26, "sine", 0.12, 1568, 0.2);
        break;
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.context) return this.context;
    try {
      this.context = new window.AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.32 : 0;
      this.master.connect(this.context.destination);
      return this.context;
    } catch {
      return null;
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    endFrequency?: number,
    delay = 0,
  ): void {
    const context = this.ensure();
    if (!context || !this.master) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(24, endFrequency),
        start + duration,
      );
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  private noise(duration: number, gain: number, cutoff: number): void {
    const context = this.ensure();
    if (!context || !this.master) return;
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    const start = context.currentTime;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.03);
  }
}

export const moonAudio = new MoonAudio();
