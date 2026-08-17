import type { SaveData } from "./types";

type SoundName =
  | "click" | "select" | "pause" | "jump" | "wallJump" | "dash" | "land"
  | "death" | "win" | "enemy" | "enemyJump" | "drone"
  | "turretLock" | "turretCharge" | "turretShot" | "bulletHit"
  | "laser" | "spike" | "crumble" | "moving";

let ctx: AudioContext | null = null;
let musicTimer = 0;
let menuMusicTimer = 0;
let forestTimer = 0;
let forestAmbience: { insects: AudioBufferSourceNode; insectsGain: GainNode } | null = null;
let slide: { osc: OscillatorNode; gain: GainNode } | null = null;
let menuMusicMood: "normal" | "calm" = "normal";
let menuMusicIntensity = 1;
let loseSoundTimers: number[] = [];
let loseSoundInterval = 0;

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function volumes(save: SaveData) {
  return {
    master: save.volume,
    music: save.volume * save.music,
    sfx: save.volume * save.effects,
  };
}

function tone(freq: number, duration: number, gain: number, type: OscillatorType, pan = 0) {
  const actx = audio();
  const osc = actx.createOscillator();
  const volume = actx.createGain();
  const stereo = actx.createStereoPanner();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, actx.currentTime);
  volume.gain.setValueAtTime(gain, actx.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
  stereo.pan.value = Math.max(-1, Math.min(1, pan));
  osc.connect(volume).connect(stereo).connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + duration);
}

function toneWithFilter(freq: number, duration: number, gain: number, type: OscillatorType, pan = 0, resonance = 0.8) {
  const actx = audio();
  const osc = actx.createOscillator();
  const volume = actx.createGain();
  const stereo = actx.createStereoPanner();
  const filter = actx.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, actx.currentTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200 + resonance * 800, actx.currentTime);
  filter.Q.value = 1.2 + resonance * 0.8;
  volume.gain.setValueAtTime(gain, actx.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
  stereo.pan.value = Math.max(-1, Math.min(1, pan));
  osc.connect(filter).connect(volume).connect(stereo).connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + duration);
}

export function playSound(name: SoundName, save: SaveData, pan = 0) {
  const v = volumes(save).sfx;
  if (v <= 0) return;
  const pick = (base: number) => base + (Math.random() - 0.5) * 50;
  const map: Record<SoundName, [number, number, number, OscillatorType]> = {
    click: [520, 0.06, 0.08, "sine"],
    select: [680, 0.08, 0.08, "triangle"],
    pause: [260, 0.12, 0.08, "square"],
    jump: [pick(520), 0.12, 0.09, "triangle"],
    wallJump: [pick(720), 0.14, 0.1, "triangle"],
    dash: [160, 0.16, 0.12, "sawtooth"],
    land: [pick(170), 0.08, 0.08, "sine"],
    death: [90, 0.28, 0.14, "sawtooth"],
    win: [1040, 0.36, 0.1, "triangle"],
    enemy: [220, 0.12, 0.07, "square"],
    enemyJump: [330, 0.14, 0.08, "triangle"],
    drone: [180, 0.18, 0.05, "sawtooth"],
    turretLock: [440, 0.09, 0.07, "square"],
    turretCharge: [700, 0.15, 0.08, "sawtooth"],
    turretShot: [110, 0.12, 0.13, "square"],
    bulletHit: [80, 0.08, 0.08, "sawtooth"],
    laser: [980, 0.07, 0.05, "sine"],
    spike: [120, 0.12, 0.1, "sawtooth"],
    crumble: [150, 0.16, 0.08, "square"],
    moving: [240, 0.1, 0.04, "triangle"],
  };
  const [freq, duration, gain, type] = map[name];
  tone(freq, duration, gain * v, type, pan);
}

export function setSlideSound(active: boolean, save: SaveData) {
  const actx = audio();
  const gainTarget = active ? volumes(save).sfx * 0.035 : 0.0001;
  if (!slide) {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 95;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(actx.destination);
    osc.start();
    slide = { osc, gain };
  }
  slide.gain.gain.setTargetAtTime(gainTarget, actx.currentTime, 0.08);
}

export function startMusic(save: SaveData) {
  const actx = audio();
  if (musicTimer) return;
  const notes = [196, 247, 294, 330, 294, 247, 220, 247];
  let i = 0;
  musicTimer = window.setInterval(() => {
    const v = volumes(save).music;
    if (v > 0) tone(notes[i % notes.length], 0.22, 0.035 * v, "triangle", 0);
    if (i % 4 === 0 && v > 0) tone(notes[(i + 2) % notes.length] / 2, 0.42, 0.025 * v, "sine", 0);
    i += 1;
  }, 260);
  void actx.resume();
}

export function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = 0;
  setSlideSound(false, { volume: 1, music: 0, effects: 0, language: "ru", completed: [], bestTimes: {}, fullscreen: false, keys: { left: "KeyA", right: "KeyD", jump: "Space", action: "KeyW" } });
}

export function startMenuMusic(save: SaveData) {
  const actx = audio();
  if (menuMusicTimer) return;
  const phrase = [
    [41, 49, 55, 61],
    [39, 46, 52, 58],
    [37, 44, 50, 57],
    [34, 41, 48, 54],
  ];
  const extraNotes = [31, 35, 38, 43];
  const layers: OscillatorType[] = ["triangle", "sawtooth", "square"];
  let i = 0;
  const playLoop = () => {
    const targetIntensity = menuMusicMood === "calm" ? 0.34 : 1;
    menuMusicIntensity += (targetIntensity - menuMusicIntensity) * 0.06;
    const v = volumes(save).music * menuMusicIntensity;
    if (v > 0) {
      if (menuMusicMood === "calm") {
        const calmNotes = [196, 247, 294, 330, 294, 247, 220, 247];
        const note = calmNotes[i % calmNotes.length];
        toneWithFilter(note, 0.72, 0.14 * v, "triangle", i % 2 === 0 ? -0.12 : 0.12, 0.2);
        if (i % 2 === 0) toneWithFilter(note / 2, 1.05, 0.08 * v, "sine", 0, 0.15);
        if (i % 4 === 0) toneWithFilter(note * 1.5, 0.42, 0.048 * v, "sine", 0.08, 0.1);
        i += 1;
        return;
      }

      const [lead, harmony, bass, pulse] = phrase[(i + 1) % phrase.length];
      const layer = i % layers.length;
      const pan = layer === 0 ? -0.35 : layer === 1 ? 0.35 : 0;
      const leadType = layer === 2 ? "sine" : layers[layer];
      const harmonyType = layer === 1 ? "square" : "triangle";
      const drift = (i % 3) * 0.8;
      const extra = extraNotes[i % extraNotes.length];

      toneWithFilter(lead + drift, 0.42 + (i % 2) * 0.08, 0.2 * v, leadType, pan, 0.95);
      toneWithFilter(harmony * 1.01 + drift * 0.6, 0.3 + (i % 3) * 0.04, 0.1 * v, harmonyType, -pan, 0.8);
      toneWithFilter(bass * 0.5, 0.66, 0.08 * v, "sine", 0, 0.45);
      tone(pulse * 2.01, 0.18, 0.052 * v, "square", pan * 0.35);
      tone(extra, 0.16, 0.036 * v, "triangle", 0);

      if (i % 3 === 0) toneWithFilter(28 + (i % 2) * 2, 1.02, 0.072 * v, "sine", 0, 0.65);
      if (i % 5 === 0) toneWithFilter(33 + (i % 2) * 3, 0.4, 0.048 * v, "triangle", 0, 0.45);
    }
    i += 1;
  };
  playLoop();
  menuMusicTimer = window.setInterval(playLoop, 420);
  void actx.resume();
}

export function stopMenuMusic() {
  if (menuMusicTimer) window.clearInterval(menuMusicTimer);
  menuMusicTimer = 0;
  menuMusicIntensity = 1;
  menuMusicMood = "normal";
}

export function setMenuMusicMood(mood: "normal" | "calm") {
  menuMusicMood = mood;
}

function createNoiseBuffer(actx: AudioContext) {
  const buffer = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function leafRustle(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  const actx = audio();
  const source = actx.createBufferSource();
  const filter = actx.createBiquadFilter();
  const gain = actx.createGain();
  const pan = actx.createStereoPanner();
  source.buffer = createNoiseBuffer(actx);
  filter.type = "bandpass";
  filter.frequency.value = 700 + Math.random() * 900;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, actx.currentTime);
  gain.gain.linearRampToValueAtTime(0.032 * v, actx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.5 + Math.random() * 0.35);
  pan.pan.value = Math.random() * 1.6 - 0.8;
  source.connect(filter).connect(gain).connect(pan).connect(actx.destination);
  source.start();
  source.stop(actx.currentTime + 0.9);
}

function twigSnap(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  const pan = Math.random() * 1.6 - 0.8;
  toneWithFilter(130 + Math.random() * 80, 0.055, 0.07 * v, "square", pan, 0.45);
  window.setTimeout(() => toneWithFilter(240 + Math.random() * 120, 0.035, 0.045 * v, "triangle", pan, 0.2), 45);
}

function distantForestCall(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  const pan = Math.random() * 1.2 - 0.6;
  toneWithFilter(180 + Math.random() * 50, 0.42, 0.035 * v, "sine", pan, 0.15);
  window.setTimeout(() => toneWithFilter(140 + Math.random() * 40, 0.55, 0.024 * v, "triangle", pan * 0.7, 0.1), 260);
}

function nightInsectChirp(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  const pan = Math.random() * 1.8 - 0.9;
  const base = 2600 + Math.random() * 900;
  tone(base, 0.025, 0.024 * v, "square", pan);
  window.setTimeout(() => tone(base * 1.04, 0.022, 0.02 * v, "square", pan), 70);
  if (Math.random() > 0.45) window.setTimeout(() => tone(base * 0.96, 0.022, 0.018 * v, "square", pan), 140);
}

function hollowWoodKnock(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  const pan = Math.random() * 1.4 - 0.7;
  toneWithFilter(95 + Math.random() * 35, 0.08, 0.055 * v, "triangle", pan, 0.35);
  window.setTimeout(() => toneWithFilter(70 + Math.random() * 20, 0.12, 0.034 * v, "sine", pan, 0.2), 95);
}

function heavyStep(save: SaveData, pan: number) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  toneWithFilter(48 + Math.random() * 12, 0.16, 0.12 * v, "sine", pan, 0.25);
  window.setTimeout(() => toneWithFilter(92 + Math.random() * 20, 0.08, 0.05 * v, "triangle", pan, 0.18), 45);
  leafRustle(save);
}

function demonNotice(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  toneWithFilter(120, 0.42, 0.12 * v, "sawtooth", -0.35, 0.9);
  toneWithFilter(180, 0.42, 0.1 * v, "square", 0.35, 0.9);
  window.setTimeout(() => toneWithFilter(65, 0.65, 0.14 * v, "sine", 0, 0.35), 120);
}

function demonRush(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  for (let i = 0; i < 8; i += 1) {
    const delay = i * 95;
    const pan = i % 2 === 0 ? -0.45 : 0.45;
    const timer = window.setTimeout(() => {
      toneWithFilter(90 + i * 18, 0.1, 0.08 * v, "sawtooth", pan, 0.8);
      toneWithFilter(42 + i * 4, 0.18, 0.09 * v, "sine", 0, 0.25);
    }, delay);
    loseSoundTimers.push(timer);
  }
}

export function startLoseAnimationSounds(save: SaveData) {
  stopLoseAnimationSounds();
  const actx = audio();
  let step = 0;

  loseSoundInterval = window.setInterval(() => {
    heavyStep(save, step % 2 === 0 ? -0.42 : 0.42);
    step += 1;
  }, 260);

  loseSoundTimers.push(
    window.setTimeout(() => {
      if (loseSoundInterval) window.clearInterval(loseSoundInterval);
      loseSoundInterval = 0;
      leafRustle(save);
      hollowWoodKnock(save);
    }, 4800),
    window.setTimeout(() => demonNotice(save), 7550),
    window.setTimeout(() => demonRush(save), 8350),
    window.setTimeout(() => playSound("death", save), 9050),
  );

  void actx.resume();
}

export function stopLoseAnimationSounds() {
  if (loseSoundInterval) window.clearInterval(loseSoundInterval);
  loseSoundInterval = 0;
  loseSoundTimers.forEach((timer) => window.clearTimeout(timer));
  loseSoundTimers = [];
}

export function startNightForestAmbience(save: SaveData) {
  const actx = audio();
  const v = volumes(save);

  if (!forestAmbience) {
    const insects = actx.createBufferSource();
    const insectsFilter = actx.createBiquadFilter();
    const insectsGain = actx.createGain();

    insects.buffer = createNoiseBuffer(actx);
    insects.loop = true;
    insectsFilter.type = "bandpass";
    insectsFilter.frequency.value = 3200;
    insectsFilter.Q.value = 0.9;
    insectsGain.gain.value = 0.0001;

    insects.connect(insectsFilter).connect(insectsGain).connect(actx.destination);
    insects.start();
    forestAmbience = { insects, insectsGain };
  }

  forestAmbience.insectsGain.gain.setTargetAtTime(0.012 * v.music, actx.currentTime, 0.6);

  if (!forestTimer) {
    leafRustle(save);
    forestTimer = window.setInterval(() => {
      const roll = Math.random();
      if (roll > 0.2) leafRustle(save);
      if (roll < 0.36) nightInsectChirp(save);
      if (roll > 0.58) twigSnap(save);
      if (roll < 0.12) hollowWoodKnock(save);
      if (roll > 0.9) distantForestCall(save);
    }, 2600);
  }
  void actx.resume();
}

export function stopNightForestAmbience() {
  if (forestTimer) window.clearInterval(forestTimer);
  forestTimer = 0;

  if (!forestAmbience || !ctx) return;
  const actx = ctx;
  forestAmbience.insectsGain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.25);
}
