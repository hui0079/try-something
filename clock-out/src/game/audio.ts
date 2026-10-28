export class Sfx {
  private ctx: AudioContext | null = null

  private context(): AudioContext | null {
    try {
      this.ctx ??= new AudioContext()
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    } catch {
      return null
    }
  }

  private beep(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.05): void {
    const ctx = this.context()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    amp.gain.value = gain
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.connect(amp)
    amp.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + dur)
  }

  jump(): void {
    this.beep(520, 0.08)
  }

  dash(): void {
    this.beep(170, 0.12, 'sawtooth', 0.04)
  }

  hurt(): void {
    this.beep(90, 0.16)
  }

  hit(): void {
    this.beep(240, 0.05, 'square', 0.04)
  }

  pickup(): void {
    this.beep(660, 0.07)
    window.setTimeout(() => this.beep(880, 0.1), 80)
  }

  ding(): void {
    this.beep(880, 0.08)
    window.setTimeout(() => this.beep(1320, 0.12), 90)
  }
}
