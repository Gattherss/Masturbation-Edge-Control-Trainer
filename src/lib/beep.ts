let ctx: AudioContext | null = null;

export function beep(durationMs = 150, frequency = 880, type: OscillatorType = 'sine') {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    osc.start();
    setTimeout(() => {
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + 0.05);
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, durationMs);
  } catch {}
}
