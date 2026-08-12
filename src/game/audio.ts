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
let forestAmbience:
  | { wind: AudioBufferSourceNode; windGain: GainNode; hum: OscillatorNode; humGain: GainNode }
  | null = null;
let slide: { osc: OscillatorNode; gain: GainNode } | null = null;
let menuMusicMood: "normal" | "calm" = "normal";
let menuMusicIntensity = 1;

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
  setSlideSound(false, { volume: 1, music: 0, effects: 0, completed: [], bestTimes: {}, fullscreen: false, keys: { left: "KeyA", right: "KeyD", jump: "Space", action: "KeyW" } });
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

function birdCall(save: SaveData) {
  const v = volumes(save).sfx;
  if (v <= 0) return;

  const actx = audio();
  const pan = Math.random() * 1.6 - 0.8;
  const base = 1200 + Math.random() * 900;
  tone(base, 0.055, 0.035 * v, "sine", pan);
  window.setTimeout(() => tone(base * 1.25, 0.05, 0.028 * v, "sine", pan), 85);
  window.setTimeout(() => tone(base * 0.92, 0.07, 0.024 * v, "triangle", pan), 165);
  void actx.resume();
}

export function startNightForestAmbience(save: SaveData) {
  const actx = audio();
  const v = volumes(save);

  if (!forestAmbience) {
    const wind = actx.createBufferSource();
    const windFilter = actx.createBiquadFilter();
    const windGain = actx.createGain();
    const hum = actx.createOscillator();
    const humFilter = actx.createBiquadFilter();
    const humGain = actx.createGain();

    wind.buffer = createNoiseBuffer(actx);
    wind.loop = true;
    windFilter.type = "lowpass";
    windFilter.frequency.value = 420;
    windGain.gain.value = 0.0001;

    hum.type = "sine";
    hum.frequency.value = 58;
    humFilter.type = "lowpass";
    humFilter.frequency.value = 140;
    humGain.gain.value = 0.0001;

    wind.connect(windFilter).connect(windGain).connect(actx.destination);
    hum.connect(humFilter).connect(humGain).connect(actx.destination);
    wind.start();
    hum.start();
    forestAmbience = { wind, windGain, hum, humGain };
  }

  forestAmbience.windGain.gain.setTargetAtTime(0.028 * v.music, actx.currentTime, 0.6);
  forestAmbience.humGain.gain.setTargetAtTime(0.018 * v.music, actx.currentTime, 0.8);

  if (!forestTimer) {
    birdCall(save);
    forestTimer = window.setInterval(() => {
      if (Math.random() > 0.35) birdCall(save);
    }, 3400);
  }
  void actx.resume();
}

export function stopNightForestAmbience() {
  if (forestTimer) window.clearInterval(forestTimer);
  forestTimer = 0;

  if (!forestAmbience || !ctx) return;
  const actx = ctx;
  forestAmbience.windGain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.25);
  forestAmbience.humGain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.25);
}
