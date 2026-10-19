let ctx: AudioContext | null = null;
let musicTimer: number | null = null;

export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

/** Original, quiet 8-bit loop for the Noir entry screen. Starts after a user gesture. */
export function startMenuMusic(): void {
  if (!ctx || ctx.state !== "running" || musicTimer !== null) return;
  const notes = [392, 494, 587, 494, 440, 587, 659, 587, 392, 494, 659, 587, 494, 440, 392, 330];
  let step = 0;
  musicTimer = window.setInterval(() => {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(notes[step % notes.length] ?? 392, now);
    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
    if (step % 4 === 0) {
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = "triangle";
      bass.frequency.setValueAtTime((notes[step % notes.length] ?? 392) / 2, now);
      bassGain.gain.setValueAtTime(0.018, now);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 0.21);
    }
    step++;
  }, 190);
}

export function stopMenuMusic(): void {
  if (musicTimer === null || typeof window === "undefined") return;
  window.clearInterval(musicTimer);
  musicTimer = null;
}

export function blip(kind: "ok" | "no" | "coin"): void {
  if (!ctx || ctx.state !== "running") return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = kind === "no" ? 196 : kind === "coin" ? 680 : 440;
  g.gain.setValueAtTime(0.045, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.1);
}
