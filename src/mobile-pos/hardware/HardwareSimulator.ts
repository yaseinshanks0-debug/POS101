export class HardwareSimulator {
  private static audioCtx: AudioContext | null = null;

  private static getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play crisp cashier barcode scan beep (high pitch short sine)
  public static playBarcodeBeep(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, ctx.currentTime); // 2.4kHz crystal beep
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);

      // Trigger mobile haptic vibration if supported by device
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Play mechanical cash drawer relay kick sound and chime
  public static playCashDrawerKick(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      // Solenoid click (low frequency pop)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(140, ctx.currentTime);
      clickGain.gain.setValueAtTime(0.4, ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(ctx.currentTime);
      clickOsc.stop(ctx.currentTime + 0.05);

      // Cash register bell chime (metallic ring)
      setTimeout(() => {
        if (!ctx) return;
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 bell
        bellGain.gain.setValueAtTime(0.2, ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.start(ctx.currentTime);
        bellOsc.stop(ctx.currentTime + 0.6);
      }, 30);

      // Double pulse vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 40, 80]);
      }
    } catch {
      // Audio fallback
    }
  }

  // Play thermal printer paper feed whirl
  public static playThermalPrintSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      // White noise burst simulating thermal head stepper motor
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.06;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(ctx.currentTime);
      whiteNoise.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio fallback
    }
  }

  // ESC/POS Thermal Command Buffer generator (58mm / 80mm ESC/POS protocol)
  public static generateEscPosHex(receiptText: string): { hexStream: string; byteCount: number } {
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;

    const commands: number[] = [
      ESC, 0x40,          // Initialize printer (ESC @)
      ESC, 0x61, 0x01,    // Center align (ESC a 1)
      ESC, 0x45, 0x01,    // Bold ON
    ];

    // Encode text to bytes
    for (let i = 0; i < receiptText.length; i++) {
      const code = receiptText.charCodeAt(i);
      commands.push(code > 127 ? 0x3F : code);
    }

    commands.push(
      LF, LF, LF,
      GS, 0x56, 0x42, 0x00 // Paper full cut (GS V 66 0)
    );

    const hexStream = commands.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    return { hexStream, byteCount: commands.length };
  }
}
