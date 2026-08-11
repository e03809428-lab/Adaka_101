import type { Rect, Vec } from "./types";

export function hit(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function playerBox(pos: Vec): Rect {
  return { x: pos.x, y: pos.y, w: 32, h: 32 };
}

export function center(rect: Rect): Vec {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}
