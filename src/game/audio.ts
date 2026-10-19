let ctx: AudioContext | null = null;
let musicTimer: number | null = null;
let musicBus: GainNode | null = null;
let nextMusicBeat = 0;
let musicBeat = 0;
const musicNodes = new Set<AudioScheduledSourceNode>();
let noiseBuffer: AudioBuffer | null = null;

const MENU_BPM = 64;
const MENU_BEAT_SECONDS = 60 / MENU_BPM;
const MENU_BEATS_PER_LOOP = 64;
const MENU_CHORDS = [
  [50, 53, 57, 60], // Dm7
  [46, 50, 53, 57], // Bbmaj7
  [41, 45, 48, 52], // Fmaj7
  [48, 52, 55, 62], // Cadd9
] as const;
const MENU_BASS = [38, 34, 29, 36];
const MENU_MELODY = [
  [4, 2, 1, 0, 2, 4, 5, 4],
  [2, 4, 5, 4, 2, 1, 2, 0],
  [4, 5, 4, 2, 1, 2, 4, 2],
  [1, 2, 4, 5, 4, 2, 1, 0],
] as const;
const MENU_SCALE = [74, 77, 79, 81, 84, 86];

export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

function midiFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function rememberMusicNode(node: AudioScheduledSourceNode): void {
  musicNodes.add(node);
  node.addEventListener("ended", () => musicNodes.delete(node), { once: true });
}

function menuTone(
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  wave: OscillatorType,
  cutoff = 2_600,
): void {
  if (!ctx || !musicBus) return;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, start);
  filter.Q.setValueAtTime(0.45, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.025);
  envelope.gain.setValueAtTime(Math.max(0.0002, volume * 0.72), start + Math.min(0.12, duration * 0.3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(musicBus);
  rememberMusicNode(oscillator);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.015);
}

function getNoiseBuffer(): AudioBuffer | null {
  if (!ctx) return null;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * 0.45;
  }
  return noiseBuffer;
}

function menuNoise(start: number, duration: number, volume: number, filterType: BiquadFilterType, cutoff: number): void {
  if (!ctx || !musicBus) return;
  const buffer = getNoiseBuffer();
  if (!buffer) return;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(cutoff, start);
  envelope.gain.setValueAtTime(Math.max(0.0001, volume), start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(musicBus);
  rememberMusicNode(source);
  source.start(start);
  source.stop(start + duration + 0.01);
}

function scheduleMenuBeat(beat: number, when: number): void {
  if (!ctx) return;
  const beatInLoop = beat % MENU_BEATS_PER_LOOP;
  const bar = Math.floor(beatInLoop / 4);
  const beatInBar = beatInLoop % 4;
  const phrase = Math.floor(bar / 4) % MENU_CHORDS.length;
  const halfBeat = MENU_BEAT_SECONDS / 2;
  const melody = MENU_MELODY[phrase];
  const chord = MENU_CHORDS[phrase];
  const bass = MENU_BASS[phrase];

  if (beatInBar === 0) {
    for (const note of chord) menuTone(midiFrequency(note), when, 1.35, 0.0048, "triangle", 1_450);
  }

  menuTone(midiFrequency(bass + (beatInBar === 3 ? 12 : 0)), when, 0.62, 0.017, "triangle", 520);

  const melodyIndex = (beatInLoop * 2) % melody.length;
  const firstNote = MENU_SCALE[melody[melodyIndex] ?? 0] ?? 74;
  const secondNote = MENU_SCALE[melody[(melodyIndex + 1) % melody.length] ?? 0] ?? 74;
  const isAccent = beatInBar === 0 || beatInBar === 2;
  menuTone(midiFrequency(firstNote), when, 0.24, isAccent ? 0.012 : 0.009, "square", 1_850);
  menuTone(midiFrequency(secondNote), when + halfBeat, 0.2, 0.008, "square", 1_850);

  // Soft, dusty 8-bit beat: rounded sub kick, filtered noise snare, quiet hats.
  if (beatInBar === 0 || beatInBar === 2) {
    const kick = ctx.createOscillator();
    const kickEnvelope = ctx.createGain();
    kick.type = "triangle";
    kick.frequency.setValueAtTime(92, when);
    kick.frequency.exponentialRampToValueAtTime(43, when + 0.13);
    kickEnvelope.gain.setValueAtTime(0.035, when);
    kickEnvelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
    kick.connect(kickEnvelope);
    kickEnvelope.connect(musicBus!);
    rememberMusicNode(kick);
    kick.start(when);
    kick.stop(when + 0.2);
  }
  if (beatInBar === 1 || beatInBar === 3) menuNoise(when, 0.12, 0.006, "bandpass", 1_650);
  menuNoise(when, 0.035, 0.0015, "highpass", 5_200);
  menuNoise(when + halfBeat, 0.028, 0.001, "highpass", 5_600);
}

function scheduleAhead(): void {
  if (!ctx || !musicBus || ctx.state !== "running") return;
  const horizon = ctx.currentTime + 1.25;
  while (nextMusicBeat < horizon) {
    scheduleMenuBeat(musicBeat, nextMusicBeat);
    nextMusicBeat += MENU_BEAT_SECONDS;
    musicBeat = (musicBeat + 1) % MENU_BEATS_PER_LOOP;
  }
}

/** One-minute original lo-fi 8-bit soundtrack for the Noir main menu. */
export function startMenuMusic(): void {
  if (!ctx || musicTimer !== null) return;
  if (ctx.state !== "running") {
    void ctx.resume().then(startMenuMusic).catch(() => undefined);
    return;
  }
  musicBus = ctx.createGain();
  musicBus.gain.setValueAtTime(0.72, ctx.currentTime);
  musicBus.connect(ctx.destination);
  musicBeat = 0;
  nextMusicBeat = ctx.currentTime + 0.08;
  scheduleAhead();
  musicTimer = window.setInterval(scheduleAhead, 100);
}

export function stopMenuMusic(): void {
  if (musicTimer !== null && typeof window !== "undefined") {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  for (const node of musicNodes) {
    try {
      node.stop();
    } catch {
      // A note may already have ended before the menu was left.
    }
  }
  musicNodes.clear();
  if (musicBus) {
    musicBus.disconnect();
    musicBus = null;
  }
}

export function blip(kind: "ok" | "no" | "coin"): void {
  if (!ctx || ctx.state !== "running") return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = kind === "coin" ? "square" : "triangle";
  o.frequency.value = kind === "no" ? 196 : kind === "coin" ? 680 : 440;
  g.gain.setValueAtTime(0.045, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.1);
  if (kind === "coin") {
    const second = ctx.createOscillator();
    const secondGain = ctx.createGain();
    second.type = "square";
    second.frequency.setValueAtTime(988, ctx.currentTime + 0.07);
    secondGain.gain.setValueAtTime(0.04, ctx.currentTime + 0.07);
    secondGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.17);
    second.connect(secondGain);
    secondGain.connect(ctx.destination);
    second.start(ctx.currentTime + 0.07);
    second.stop(ctx.currentTime + 0.18);
  }
}
