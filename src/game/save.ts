import type { SaveData } from "./types";

const key = "ten-seconds-ago-save";

export const defaultSave: SaveData = {
  completed: [],
  bestTimes: {},
  volume: 0.7,
  music: 0.35,
  effects: 0.65,
  fullscreen: false,
  keys: { left: "KeyA", right: "KeyD", jump: "Space", action: "KeyE" },
};

export function loadSave(): SaveData {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultSave;

  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...defaultSave, ...parsed, bestTimes: parsed.bestTimes ?? {} };
  } catch {
    return defaultSave;
  }
}

export function storeSave(save: SaveData) {
  localStorage.setItem(key, JSON.stringify(save));
}
