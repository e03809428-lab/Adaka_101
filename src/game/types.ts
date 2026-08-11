export type Vec = { x: number; y: number };
export type Rect = Vec & { w: number; h: number };

export type MovingPlatform = Rect & {
  axis: "x" | "y";
  distance: number;
  speed: number;
};

export type CrumblePlatform = Rect & {
  id: string;
  delay: number;
};

export type BouncePad = Rect & {
  power: Vec;
};

export type Enemy =
  | (Rect & { kind: "runner"; range: number; speed: number })
  | (Rect & { kind: "jumper"; interval: number })
  | (Rect & { kind: "drone"; range: number; speed: number });

export type Turret = Rect & {
  kind: "single" | "burst" | "ceiling";
  cooldown: number;
  projectile: "normal" | "fast" | "slow" | "bounce" | "homing";
  direction: Vec;
};

export type Level = {
  id: number;
  name: string;
  start: Vec;
  exit: Rect;
  platforms: Rect[];
  checkpoints?: Rect[];
  hazards?: Rect[];
  lasers?: Rect[];
  movingPlatforms?: MovingPlatform[];
  crumblePlatforms?: CrumblePlatform[];
  bouncePads?: BouncePad[];
  enemies?: Enemy[];
  turrets?: Turret[];
};

export type SaveData = {
  completed: number[];
  bestTimes: Record<number, number>;
  volume: number;
  music: number;
  effects: number;
  fullscreen: boolean;
  keys: Record<"left" | "right" | "jump" | "action", string>;
};
