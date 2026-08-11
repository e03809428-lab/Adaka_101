import type { SaveData } from "./types";

type SoundName =
  | "click" | "select" | "pause" | "jump" | "wallJump" | "dash" | "land"
  | "death" | "checkpoint" | "win" | "enemy" | "enemyJump" | "drone"
  | "turretLock" | "turretCharge" | "turretShot" | "bulletHit"
  | "laser" | "spike" | "crumble" | "moving";

let ctx: AudioContext | null = null;
let musicTimer = 0;
let slide: { osc: OscillatorNode; gain: GainNode } | null = null;

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
    checkpoint: [880, 0.18, 0.09, "sine"],
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
  setSlideSound(false, { volume: 1, music: 0, effects: 0, completed: [], bestTimes: {}, fullscreen: false, keys: { left: "KeyA", right: "KeyD", jump: "Space", action: "KeyE" } });
}
