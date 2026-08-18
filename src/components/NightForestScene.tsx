import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import fireDemonImage from "../assets/fire-demon-transparent.png";
import iceDemonImage from "../assets/ice-demon-transparent.png";
import darkDemonImage from "../assets/menu-dark-demon-redraw-solid.png";
import pixelSpruceImage from "../assets/pixel-spruce-green.png";
import spellHandsImage from "../assets/spell-hands-pixel.png";
import { startLoseAnimationSounds, startNightForestAmbience, stopLoseAnimationSounds, stopNightForestAmbience } from "../game/audio";
import { t } from "../game/language";
import type { SaveData } from "../game/types";
import "../game/game.css";

type Direction = "north" | "east" | "south" | "west";
type View = Direction | "up";
type ForestPlace = "center" | Direction;
type FullMapPhase = "closed" | "closingIn" | "open" | "closingOut" | "opening";
type ManaRitualPhase = FullMapPhase;
type FireSpellPhase = "idle" | "charging" | "shooting" | "ending";
type ActiveSpell = "fire" | "ice" | null;
type ManaRitualKind = "elemental" | "external";
type DemonNode = "center" | "north" | "east" | "south" | "west" | "northWest" | "northEast" | "southWest" | "southEast";
type TurnMotion = "left" | "right" | "up" | "down";
type TreeVariant = "thin" | "wide" | "tall" | "dark" | "pale" | "frost" | "crooked" | "shadow";
type ForestTree = { left: string; scale: number; tilt: number; layer: "back" | "mid" | "front"; variant: TreeVariant };
type TreeStyle = CSSProperties & { "--tree-brightness": number };

type Props = {
  onBack: () => void;
  save: SaveData;
  setSave: (save: SaveData) => void;
  night: number;
  initialWon?: boolean;
};

const viewOrder: Direction[] = ["north", "east", "south", "west"];
const grassSeeds: Record<Direction, number> = { north: 19, east: 43, south: 71, west: 107 };
const demonGraph: Record<DemonNode, DemonNode[]> = {
  center: ["north", "east", "south", "west"],
  north: ["center", "northWest", "northEast"],
  east: ["center", "northEast", "southEast"],
  south: ["center", "southWest", "southEast"],
  west: ["center", "northWest", "southWest"],
  northWest: ["north", "west", "northEast"],
  northEast: ["north", "east", "northWest"],
  southWest: ["south", "west", "southEast"],
  southEast: ["south", "east", "southWest"],
};
const demonDistanceToCenter: Record<DemonNode, number> = {
  center: 0,
  north: 1,
  east: 1,
  south: 1,
  west: 1,
  northWest: 2,
  northEast: 2,
  southWest: 2,
  southEast: 2,
};
const turnCooldownMs = 200;
const nightHourMs = 90000;
const nightTickMs = 250;
const minFireDemonAiMs = 12000;
const maxFireDemonAiMs = 24000;
const fireDemonReactionMs = 15000;
const maxPlayerMana = 50;
const maxExternalMana = 100;
const fireSpellManaCost = 10;
const iceSpellManaCost = 15;
const fireSpellChargeMs = 2000;
const fireSpellShootMs = 1300;
const fireSpellEndMs = 520;
const spellImpactDelayMs = 520;
const manaRitualSectors = 16;
const externalManaRitualSectors = 4;
const manaRitualSectorWidthDegrees = 21;
const externalManaRitualSectorWidthDegrees = manaRitualSectorWidthDegrees * 4;
const manaRitualSpinMs = 1200;
const manaRitualSectorGapDegrees = 1.5;
const manaRitualTryCooldownMs = 200;
const manaGain = 1;
const externalManaGain = 1;
const manaRitualLetters = ["A", "S", "D", "W"] as const;
type ManaRitualLetter = (typeof manaRitualLetters)[number];
const manaRitualKeyByCode: Record<string, ManaRitualLetter> = {
  KeyA: "A",
  KeyS: "S",
  KeyD: "D",
  KeyW: "W",
};
const manaRitualKeyBySymbol: Record<string, ManaRitualLetter> = {
  a: "A",
  s: "S",
  d: "D",
  w: "W",
  ф: "A",
  ы: "S",
  в: "D",
  ц: "W",
};

function nextFireDemonAiMs() {
  return minFireDemonAiMs + Math.random() * (maxFireDemonAiMs - minFireDemonAiMs);
}

function grassPixels(direction: Direction) {
  const seed = grassSeeds[direction];
  return Array.from({ length: 780 }, (_, index) => ({
    left: `${(index * 29 + seed * 7 + (index % 23) * 11) % 100}%`,
    top: `${8 + ((index * 31 + seed * 13 + (index % 19) * 5) % 88)}%`,
    color: (index * 5 + seed + (index % 11)) % 12,
  }));
}

function demonDirectionFromNode(node: DemonNode): Direction {
  const directionByNode: Record<DemonNode, Direction> = {
    center: "north",
    north: "north",
    east: "east",
    south: "south",
    west: "west",
    northWest: "north",
    northEast: "north",
    southWest: "south",
    southEast: "south",
  };
  return directionByNode[node];
}

function randomHorizontalDirection(): Direction {
  return Math.random() > 0.5 ? "east" : "west";
}

function randomVerticalDirection(): Direction {
  return Math.random() > 0.5 ? "north" : "south";
}

function randomOuterNode(): DemonNode {
  const nodes: DemonNode[] = ["north", "east", "south", "west"];
  return nodes[Math.floor(Math.random() * nodes.length)];
}

function randomFireOuterNode(): DemonNode {
  return Math.random() < 0.82 ? (Math.random() > 0.5 ? "east" : "west") : randomOuterNode();
}

function randomIceOuterNode(): DemonNode {
  return Math.random() < 0.82 ? (Math.random() > 0.5 ? "north" : "south") : randomOuterNode();
}

function weightedDemonMoveOptions(kind: "fire" | "ice", nodes: DemonNode[]) {
  const preferred = kind === "fire" ? new Set<DemonNode>(["east", "west"]) : new Set<DemonNode>(["north", "south"]);
  return nodes.flatMap((node) => preferred.has(node) ? [node, node, node] : [node]);
}

function getTreeBrightness(scale: number) {
  return Math.max(0.48, Math.min(1, 0.52 + scale * 0.36));
}

const forestViews: Record<Direction, ForestTree[]> = {
  north: [
    { left: "-4%", scale: 1.06, tilt: -4, layer: "front", variant: "dark" },
    { left: "1%", scale: 0.62, tilt: 3, layer: "back", variant: "shadow" },
    { left: "7%", scale: 0.9, tilt: 5, layer: "back", variant: "thin" },
    { left: "13%", scale: 0.78, tilt: -6, layer: "mid", variant: "crooked" },
    { left: "16%", scale: 0.58, tilt: 2, layer: "back", variant: "frost" },
    { left: "19%", scale: 1.24, tilt: -3, layer: "front", variant: "wide" },
    { left: "27%", scale: 0.84, tilt: 7, layer: "back", variant: "shadow" },
    { left: "33%", scale: 1.0, tilt: 4, layer: "mid", variant: "pale" },
    { left: "41%", scale: 0.72, tilt: -8, layer: "back", variant: "frost" },
    { left: "47%", scale: 0.56, tilt: 5, layer: "back", variant: "thin" },
    { left: "55%", scale: 0.86, tilt: -2, layer: "mid", variant: "tall" },
    { left: "68%", scale: 0.94, tilt: 3, layer: "back", variant: "dark" },
    { left: "64%", scale: 0.6, tilt: -3, layer: "back", variant: "shadow" },
    { left: "71%", scale: 0.82, tilt: 8, layer: "mid", variant: "crooked" },
    { left: "78%", scale: 1.16, tilt: -6, layer: "mid", variant: "thin" },
    { left: "86%", scale: 0.88, tilt: 5, layer: "back", variant: "frost" },
    { left: "90%", scale: 0.58, tilt: -4, layer: "back", variant: "thin" },
    { left: "94%", scale: 1.28, tilt: 2, layer: "front", variant: "wide" },
    { left: "106%", scale: 1.02, tilt: 6, layer: "front", variant: "dark" },
  ],
  east: [
    { left: "3%", scale: 1.3, tilt: -7, layer: "front", variant: "tall" },
    { left: "8%", scale: 0.76, tilt: 6, layer: "back", variant: "frost" },
    { left: "10%", scale: 0.56, tilt: -2, layer: "back", variant: "shadow" },
    { left: "14%", scale: 0.88, tilt: 2, layer: "back", variant: "dark" },
    { left: "19%", scale: 1.02, tilt: -8, layer: "mid", variant: "crooked" },
    { left: "23%", scale: 0.6, tilt: 5, layer: "back", variant: "thin" },
    { left: "26%", scale: 1.08, tilt: -4, layer: "mid", variant: "wide" },
    { left: "36%", scale: 0.78, tilt: 7, layer: "back", variant: "shadow" },
    { left: "35%", scale: 0.96, tilt: 5, layer: "back", variant: "thin" },
    { left: "43%", scale: 0.58, tilt: -6, layer: "back", variant: "frost" },
    { left: "48%", scale: 0.84, tilt: -3, layer: "mid", variant: "dark" },
    { left: "58%", scale: 0.78, tilt: 6, layer: "back", variant: "tall" },
    { left: "62%", scale: 0.54, tilt: 3, layer: "back", variant: "shadow" },
    { left: "69%", scale: 0.9, tilt: -9, layer: "mid", variant: "frost" },
    { left: "74%", scale: 1.02, tilt: -5, layer: "mid", variant: "pale" },
    { left: "82%", scale: 0.82, tilt: 4, layer: "back", variant: "shadow" },
    { left: "86%", scale: 0.6, tilt: -2, layer: "back", variant: "thin" },
    { left: "89%", scale: 1.18, tilt: 7, layer: "front", variant: "thin" },
    { left: "103%", scale: 0.92, tilt: -2, layer: "back", variant: "dark" },
  ],
  south: [
    { left: "-3%", scale: 1.18, tilt: 1, layer: "front", variant: "dark" },
    { left: "5%", scale: 0.78, tilt: 3, layer: "back", variant: "shadow" },
    { left: "8%", scale: 0.56, tilt: -1, layer: "back", variant: "thin" },
    { left: "11%", scale: 0.9, tilt: -2, layer: "back", variant: "thin" },
    { left: "17%", scale: 1.08, tilt: 2, layer: "mid", variant: "frost" },
    { left: "21%", scale: 0.6, tilt: 1, layer: "back", variant: "shadow" },
    { left: "25%", scale: 1.36, tilt: 1, layer: "front", variant: "tall" },
    { left: "34%", scale: 0.84, tilt: -2, layer: "mid", variant: "thin" },
    { left: "38%", scale: 0.58, tilt: 2, layer: "back", variant: "frost" },
    { left: "43%", scale: 1.04, tilt: 1, layer: "mid", variant: "pale" },
    { left: "51%", scale: 0.82, tilt: -1, layer: "back", variant: "dark" },
    { left: "55%", scale: 0.54, tilt: -2, layer: "back", variant: "shadow" },
    { left: "59%", scale: 1.18, tilt: 2, layer: "front", variant: "wide" },
    { left: "67%", scale: 0.78, tilt: 2, layer: "back", variant: "shadow" },
    { left: "74%", scale: 0.96, tilt: -2, layer: "back", variant: "frost" },
    { left: "78%", scale: 0.58, tilt: 1, layer: "back", variant: "thin" },
    { left: "82%", scale: 1.08, tilt: 1, layer: "mid", variant: "thin" },
    { left: "91%", scale: 0.86, tilt: 3, layer: "back", variant: "dark" },
    { left: "96%", scale: 0.6, tilt: -1, layer: "back", variant: "shadow" },
    { left: "101%", scale: 1.28, tilt: -1, layer: "front", variant: "tall" },
  ],
  west: [
    { left: "-5%", scale: 1.02, tilt: -1, layer: "front", variant: "dark" },
    { left: "4%", scale: 0.84, tilt: 2, layer: "back", variant: "frost" },
    { left: "8%", scale: 0.58, tilt: -1, layer: "back", variant: "shadow" },
    { left: "12%", scale: 1.18, tilt: -1, layer: "front", variant: "wide" },
    { left: "21%", scale: 0.8, tilt: 2, layer: "mid", variant: "thin" },
    { left: "25%", scale: 0.56, tilt: 1, layer: "back", variant: "frost" },
    { left: "30%", scale: 0.92, tilt: 1, layer: "back", variant: "shadow" },
    { left: "39%", scale: 1.12, tilt: -2, layer: "mid", variant: "pale" },
    { left: "44%", scale: 0.6, tilt: 2, layer: "back", variant: "thin" },
    { left: "50%", scale: 0.82, tilt: 1, layer: "back", variant: "dark" },
    { left: "56%", scale: 0.54, tilt: -1, layer: "back", variant: "shadow" },
    { left: "61%", scale: 1.0, tilt: 2, layer: "mid", variant: "tall" },
    { left: "70%", scale: 1.22, tilt: -1, layer: "front", variant: "wide" },
    { left: "79%", scale: 0.84, tilt: 2, layer: "mid", variant: "thin" },
    { left: "84%", scale: 0.58, tilt: -2, layer: "back", variant: "frost" },
    { left: "88%", scale: 0.94, tilt: -2, layer: "back", variant: "frost" },
    { left: "98%", scale: 1.08, tilt: 1, layer: "front", variant: "dark" },
    { left: "104%", scale: 0.62, tilt: 1, layer: "back", variant: "shadow" },
  ],
};

export function NightForestScene({ onBack, save, setSave, night, initialWon = false }: Props) {
  const [direction, setDirection] = useState<Direction>("north");
  const [view, setView] = useState<View>("north");
  const place: ForestPlace = "center";
  const [turning, setTurning] = useState(false);
  const [turnMotion, setTurnMotion] = useState<TurnMotion>("right");
  const [turnFrame, setTurnFrame] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fullMapPhase, setFullMapPhase] = useState<FullMapPhase>("closed");
  const [fireDemonNode, setFireDemonNode] = useState<DemonNode>(() => randomFireOuterNode());
  const [iceDemonNode, setIceDemonNode] = useState<DemonNode>(() => randomIceOuterNode());
  const [fireDemonAttackDirection, setFireDemonAttackDirection] = useState<Direction>(() => randomHorizontalDirection());
  const [iceDemonAttackDirection, setIceDemonAttackDirection] = useState<Direction>(() => randomVerticalDirection());
  const [nightHour, setNightHour] = useState(0);
  const [playerMana, setPlayerMana] = useState(0);
  const [externalMana, setExternalMana] = useState(0);
  const [fireSpellPhase, setFireSpellPhase] = useState<FireSpellPhase>("idle");
  const [activeSpell, setActiveSpell] = useState<ActiveSpell>(null);
  const [activeSpellHitsTarget, setActiveSpellHitsTarget] = useState(false);
  const [iceImpactKey, setIceImpactKey] = useState(0);
  const [fireImpactKey, setFireImpactKey] = useState(0);
  const [manaRitualPhase, setManaRitualPhase] = useState<ManaRitualPhase>("closed");
  const [manaRitualKind, setManaRitualKind] = useState<ManaRitualKind>("elemental");
  const [manaTargetSector, setManaTargetSector] = useState(() => Math.floor(Math.random() * manaRitualSectors));
  const [manaRitualLetter, setManaRitualLetter] = useState<ManaRitualLetter>("W");
  const [isWon, setIsWon] = useState(initialWon);
  const [isLost, setIsLost] = useState(false);
  const [isLossPending, setIsLossPending] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isFireDemonMoving, setIsFireDemonMoving] = useState(false);
  const [isFireDemonLeaving, setIsFireDemonLeaving] = useState(false);
  const [isIceDemonMoving, setIsIceDemonMoving] = useState(false);
  const [isIceDemonLeaving, setIsIceDemonLeaving] = useState(false);
  const [isIntroLetterOpen, setIsIntroLetterOpen] = useState(false);
  const [isIntroLetterClosing, setIsIntroLetterClosing] = useState(false);
  const [isIntroLetterDone, setIsIntroLetterDone] = useState(night !== 1);
  const [isIntroLetterPending, setIsIntroLetterPending] = useState(false);
  const canTurn = useRef(true);
  const cooldownTimeout = useRef(0);
  const fullMapTimeouts = useRef<number[]>([]);
  const nightProgressMs = useRef(0);
  const fireDemonAiProgressMs = useRef(0);
  const iceDemonAiProgressMs = useRef(0);
  const fireDemonAiTargetMs = useRef(nextFireDemonAiMs());
  const iceDemonAiTargetMs = useRef(nextFireDemonAiMs());
  const fireDemonThreatTimeout = useRef(0);
  const iceDemonThreatTimeout = useRef(0);
  const manaRitualStartedAt = useRef(0);
  const lastManaRitualTryAt = useRef(0);
  const lastManaRitualLetterChangeAt = useRef(0);
  const fireSpellTimeouts = useRef<number[]>([]);
  const manaArrowRef = useRef<HTMLSpanElement | null>(null);
  const manaRitualLetterRef = useRef<ManaRitualLetter>(manaRitualLetter);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const groundDirection = view === "up" ? direction : view;
  const text = (key: Parameters<typeof t>[1]) => t(save.language, key);
  const clockText = `${nightHour === 0 ? 12 : nightHour}.00`;
  const isFireDemonNight = night >= 1;
  const fireDemonViewDirection = fireDemonNode === "center" ? fireDemonAttackDirection : demonDirectionFromNode(fireDemonNode);
  const iceDemonViewDirection = iceDemonNode === "center" ? iceDemonAttackDirection : demonDirectionFromNode(iceDemonNode);
  const showFireDemon =
    isFireDemonNight &&
    fireDemonNode === place &&
    view !== "up" &&
    (fireDemonViewDirection === "east" || fireDemonViewDirection === "west") &&
    groundDirection === fireDemonViewDirection;
  const showIceDemon =
    isFireDemonNight &&
    iceDemonNode === place &&
    view !== "up" &&
    (iceDemonViewDirection === "north" || iceDemonViewDirection === "south") &&
    groundDirection === iceDemonViewDirection;
  const shouldRenderFireDemon = showFireDemon || isFireDemonLeaving;
  const shouldRenderIceDemon = showIceDemon || isIceDemonLeaving;
  const isFullMapMenuOpen = fullMapPhase === "open";
  const isManaRitualOpen = manaRitualPhase === "open";
  const isManaRitualActive = manaRitualPhase !== "closed";
  const manaRitualTimeScale = isManaRitualActive ? 0.35 : 1;
  const manaPercent = (playerMana / maxPlayerMana) * 100;
  const externalManaPercent = (externalMana / maxExternalMana) * 100;
  const isSpellActive = fireSpellPhase !== "idle";
  const isSpellProjectileVisible = fireSpellPhase === "charging" || fireSpellPhase === "shooting";
  const activeManaRitualSectors = manaRitualKind === "external" ? externalManaRitualSectors : manaRitualSectors;
  const activeManaRitualSectorStepDegrees = 360 / activeManaRitualSectors;
  const activeManaRitualSectorWidthDegrees = manaRitualKind === "external" ? externalManaRitualSectorWidthDegrees : manaRitualSectorWidthDegrees;

  const pushFireDemonAway = () => {
    window.clearTimeout(fireDemonThreatTimeout.current);
    setIsFireDemonLeaving(true);
    setFireDemonNode(randomFireOuterNode());
    window.setTimeout(() => setIsFireDemonLeaving(false), 620);
  };

  const pushIceDemonAway = () => {
    window.clearTimeout(iceDemonThreatTimeout.current);
    setIsIceDemonLeaving(true);
    setIceDemonNode(randomIceOuterNode());
    window.setTimeout(() => setIsIceDemonLeaving(false), 620);
  };

  const castSpell = (spell: Exclude<ActiveSpell, null>, manaCost: number, hitsTarget = false) => {
    if (isSpellActive || playerMana < manaCost) return;

    if (hitsTarget) {
      window.clearTimeout(fireDemonThreatTimeout.current);
      window.clearTimeout(iceDemonThreatTimeout.current);
      if (spell === "fire" && fireDemonNode === "center") {
        fireDemonThreatTimeout.current = window.setTimeout(() => {
          setIsLossPending(true);
        }, fireDemonReactionMs);
      }
      if (spell === "ice" && iceDemonNode === "center") {
        iceDemonThreatTimeout.current = window.setTimeout(() => {
          setIsLossPending(true);
        }, fireDemonReactionMs);
      }
    }

    setPlayerMana((current) => current - manaCost);
    setActiveSpell(spell);
    setActiveSpellHitsTarget(hitsTarget);
    setFireSpellPhase("charging");
    fireSpellTimeouts.current.push(window.setTimeout(() => setFireSpellPhase("shooting"), fireSpellChargeMs));
    if (spell === "fire" && hitsTarget) {
      fireSpellTimeouts.current.push(window.setTimeout(() => {
        setFireImpactKey((current) => current + 1);
        if (showIceDemon) pushIceDemonAway();
      }, fireSpellChargeMs + spellImpactDelayMs));
      fireSpellTimeouts.current.push(window.setTimeout(() => setFireImpactKey(0), fireSpellChargeMs + 1100));
    }
    if (spell === "ice" && hitsTarget) {
      fireSpellTimeouts.current.push(window.setTimeout(() => {
        setIceImpactKey((current) => current + 1);
        if (showFireDemon) pushFireDemonAway();
      }, fireSpellChargeMs + spellImpactDelayMs));
      fireSpellTimeouts.current.push(window.setTimeout(() => setIceImpactKey(0), fireSpellChargeMs + 1100));
    }
    fireSpellTimeouts.current.push(window.setTimeout(() => {
      setFireSpellPhase("ending");
    }, fireSpellChargeMs + fireSpellShootMs));
    fireSpellTimeouts.current.push(window.setTimeout(() => {
      setFireSpellPhase("idle");
      setActiveSpell(null);
      setActiveSpellHitsTarget(false);
    }, fireSpellChargeMs + fireSpellShootMs + fireSpellEndMs));
  };

  const castFireSpell = () => castSpell("fire", fireSpellManaCost, showFireDemon || showIceDemon);
  const castIceSpell = () => {
    if (!showFireDemon && !showIceDemon) return;

    castSpell("ice", iceSpellManaCost, true);
  };

  const pressGameKey = (code: string, key = "") => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, key }));
  };

  const pressMobileGameKey = (
    event: { preventDefault: () => void; stopPropagation: () => void },
    code: string,
    key = "",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    pressGameKey(code, key);
  };

  const closeMobileManaRitual = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    closeManaRitual();
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest(".forest-mobile-controls") || target?.closest(".mana-ritual-controls") || target?.closest(".spell-buttons") || target?.closest(".forest-key-buttons")) return;

    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest(".forest-mobile-controls") || target?.closest(".mana-ritual-controls") || target?.closest(".spell-buttons") || target?.closest(".forest-key-buttons")) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const minSwipeDistance = 42;

    if (Math.max(absX, absY) < minSwipeDistance) return;

    if (absX > absY) {
      pressGameKey(deltaX > 0 ? "ArrowRight" : "ArrowLeft");
      return;
    }

    pressGameKey(deltaY < 0 ? "ArrowUp" : "ArrowDown");
  };

  const startManaRitual = (kind: ManaRitualKind) => {
    if (manaRitualPhase !== "closed") return;
    const sectorCount = kind === "external" ? externalManaRitualSectors : manaRitualSectors;
    manaRitualStartedAt.current = Date.now();
    setManaRitualKind(kind);
    setManaTargetSector(Math.floor(Math.random() * sectorCount));
    setManaRitualPhase("closingIn");
    fullMapTimeouts.current.push(window.setTimeout(() => setManaRitualPhase("open"), 1000));
  };

  const closeManaRitual = () => {
    if (manaRitualPhase !== "open" && manaRitualPhase !== "closingIn") return;
    setManaRitualPhase("closingOut");
    fullMapTimeouts.current.push(window.setTimeout(() => {
      setManaRitualPhase("opening");
      fullMapTimeouts.current.push(window.setTimeout(() => setManaRitualPhase("closed"), 700));
    }, 1000));
  };

  const closeFullMap = () => {
    if (fullMapPhase !== "open" && fullMapPhase !== "closingIn") return;
    fullMapTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    fullMapTimeouts.current = [];
    setFullMapPhase("closingOut");
    fullMapTimeouts.current.push(window.setTimeout(() => {
      setFullMapPhase("opening");
      fullMapTimeouts.current.push(window.setTimeout(() => setFullMapPhase("closed"), 700));
    }, 1000));
  };

  const closeOverlayButton = (event: { preventDefault: () => void; stopPropagation: () => void }, onClose: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const pressedManaRitualLetter = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    return manaRitualKeyByCode[event.code] ?? manaRitualKeyBySymbol[key];
  };

  const tryManaRitual = () => {
    const now = Date.now();
    if (now - lastManaRitualTryAt.current < manaRitualTryCooldownMs) return false;
    lastManaRitualTryAt.current = now;

    const arrowTransform = manaArrowRef.current ? window.getComputedStyle(manaArrowRef.current).transform : "";
    const matrix = arrowTransform.match(/matrix\(([^)]+)\)/);
    const values = matrix?.[1].split(",").map((value) => Number.parseFloat(value.trim()));
    const arrowAngle = values && values.length >= 2
      ? (Math.atan2(values[1], values[0]) * 180 / Math.PI + 360) % 360
      : ((now - manaRitualStartedAt.current) % manaRitualSpinMs / manaRitualSpinMs) * 360;
    const arrowSector = Math.floor(arrowAngle / activeManaRitualSectorStepDegrees) % activeManaRitualSectors;
    const arrowSectorOffset = arrowAngle % activeManaRitualSectorStepDegrees;
    const hitStart = Math.max(0, manaRitualSectorGapDegrees - 2);
    const hitEnd = Math.min(activeManaRitualSectorStepDegrees, activeManaRitualSectorWidthDegrees + 2);
    const hitsExternalSector = manaRitualKind === "external" && arrowSectorOffset >= hitStart && arrowSectorOffset <= hitEnd;
    const hitsElementalSector =
      arrowSector === manaTargetSector &&
      arrowSectorOffset >= hitStart &&
      arrowSectorOffset <= hitEnd;

    if (hitsExternalSector || hitsElementalSector) {
      if (manaRitualKind === "external") {
        setExternalMana((current) => Math.min(maxExternalMana, current + externalManaGain));
      } else {
        setPlayerMana((current) => Math.min(maxPlayerMana, current + manaGain));
      }
    }

    manaRitualStartedAt.current = Date.now();
    setManaTargetSector(Math.floor(Math.random() * activeManaRitualSectors));
    return true;
  };

  const changeManaRitualLetter = (force = false) => {
    const now = Date.now();
    if (!force && now - lastManaRitualLetterChangeAt.current < manaRitualTryCooldownMs) return;
    lastManaRitualLetterChangeAt.current = now;

    setManaRitualLetter((current) => {
      const nextLetters = manaRitualLetters.filter((letter) => letter !== current);
      const nextLetter = nextLetters[Math.floor(Math.random() * nextLetters.length)];
      manaRitualLetterRef.current = nextLetter;
      return nextLetter;
    });
  };

  const pressManaRitualLetter = (letter: ManaRitualLetter) => {
    if (!isManaRitualOpen) return;

    if (letter === manaRitualLetterRef.current) {
      if (tryManaRitual()) changeManaRitualLetter(true);
      return;
    }

    changeManaRitualLetter();
  };

  const pressMobileManaRitualLetter = (
    event: { preventDefault: () => void; stopPropagation: () => void },
    letter: ManaRitualLetter,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    pressManaRitualLetter(letter);
  };

  useEffect(() => {
    manaRitualLetterRef.current = manaRitualLetter;
  }, [manaRitualLetter]);

  useEffect(() => {
    startNightForestAmbience(save);
    return () => {
      stopLoseAnimationSounds();
      stopNightForestAmbience();
    };
  }, [save]);

  useEffect(() => {
    if (!isLost) {
      stopLoseAnimationSounds();
      return;
    }

    startLoseAnimationSounds(save);
    return () => stopLoseAnimationSounds();
  }, [isLost, save]);

  useEffect(() => {
    if (!isWon) return;
    if (save.completedNights.includes(night)) return;

    setSave({
      ...save,
      completedNights: [...new Set([...save.completedNights, night])],
    });
  }, [isWon, night, save, setSave]);

  useEffect(() => {
    if (night !== 1 || isIntroLetterDone) return;

    const timeout = window.setTimeout(() => setIsIntroLetterPending(true), 5000);
    return () => window.clearTimeout(timeout);
  }, [isIntroLetterDone, night]);

  useEffect(() => {
    if (!isIntroLetterPending || isIntroLetterDone) return;

    if (fullMapPhase === "open") {
      fullMapTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      fullMapTimeouts.current = [];
      setFullMapPhase("closingOut");
      fullMapTimeouts.current.push(window.setTimeout(() => {
        setFullMapPhase("opening");
        fullMapTimeouts.current.push(window.setTimeout(() => setFullMapPhase("closed"), 700));
      }, 1000));
      return;
    }

    if (fullMapPhase !== "closed") return;

    setIsIntroLetterOpen(true);
    setIsIntroLetterPending(false);
  }, [fullMapPhase, isIntroLetterDone, isIntroLetterPending]);

  useEffect(() => {
    if (isPaused || isWon || isLost || isIntroLetterOpen) return;

    const interval = window.setInterval(() => {
      const firstNightEase = night === 1 ? 0.55 : 1;
      const timeScale = (isFullMapMenuOpen ? 0.5 : 1) * manaRitualTimeScale * firstNightEase;
      nightProgressMs.current += nightTickMs * timeScale;
      if (nightProgressMs.current < nightHourMs) return;

      nightProgressMs.current -= nightHourMs;
      setNightHour((current) => {
        const nextHour = current + 1;
        if (nextHour >= 6) setIsWon(true);
        return Math.min(nextHour, 6);
      });
    }, nightTickMs);

    return () => window.clearInterval(interval);
  }, [isFullMapMenuOpen, isIntroLetterOpen, isLost, isPaused, isWon, manaRitualTimeScale]);

  useEffect(() => {
    if (!isFireDemonNight || isPaused || isWon || isLost || isIntroLetterOpen) return;

    const interval = window.setInterval(() => {
      const timeScale = (isFullMapMenuOpen ? 0.5 : 1) * manaRitualTimeScale;
      fireDemonAiProgressMs.current += nightTickMs * timeScale;
      if (fireDemonAiProgressMs.current >= fireDemonAiTargetMs.current) {
        fireDemonAiProgressMs.current = 0;
        fireDemonAiTargetMs.current = nextFireDemonAiMs();

        setFireDemonNode((current) => {
          const isPlayerFacingDemon = current === place && view !== "up" && (place === "center" || groundDirection === place);
          if (isPlayerFacingDemon) return current;

          const aiLevel = night === 1 ? 2 + Math.floor(nightHour / 2) : 3 + nightHour;
          const moveRoll = Math.floor(Math.random() * 20) + 1;
          if (moveRoll > aiLevel) return current;

          const nextNodes = demonGraph[current];
          const closerNodes = nextNodes.filter((node) => demonDistanceToCenter[node] < demonDistanceToCenter[current]);
          const moveOptions = weightedDemonMoveOptions("fire", closerNodes.length > 0 ? closerNodes : nextNodes);
          const nextNode = moveOptions[Math.floor(Math.random() * moveOptions.length)];

          if (nextNode !== current) {
            setIsFireDemonMoving(true);
            const moveDelayMs = isFullMapMenuOpen ? 760 : 420;
            window.setTimeout(() => {
              if (nextNode === "center") setFireDemonAttackDirection(randomHorizontalDirection());
              setFireDemonNode(nextNode);
              setIsFireDemonMoving(false);
              setIsFireDemonLeaving(false);
            }, moveDelayMs);
          }
          return current;
        });
      }

      iceDemonAiProgressMs.current += nightTickMs * timeScale;
      if (iceDemonAiProgressMs.current < iceDemonAiTargetMs.current) return;
      iceDemonAiProgressMs.current = 0;
      iceDemonAiTargetMs.current = nextFireDemonAiMs();

      setIceDemonNode((current) => {
        const isPlayerFacingDemon = current === place && view !== "up" && (place === "center" || groundDirection === place);
        if (isPlayerFacingDemon) return current;

          const aiLevel = night === 1 ? 2 + Math.floor(nightHour / 2) : 3 + nightHour;
        const moveRoll = Math.floor(Math.random() * 20) + 1;
        if (moveRoll > aiLevel) return current;

        const nextNodes = demonGraph[current];
        const closerNodes = nextNodes.filter((node) => demonDistanceToCenter[node] < demonDistanceToCenter[current]);
        const moveOptions = weightedDemonMoveOptions("ice", closerNodes.length > 0 ? closerNodes : nextNodes);
        const nextNode = moveOptions[Math.floor(Math.random() * moveOptions.length)];

        if (nextNode !== current) {
          setIsIceDemonMoving(true);
          const moveDelayMs = isFullMapMenuOpen ? 760 : 420;
          window.setTimeout(() => {
            if (nextNode === "center") setIceDemonAttackDirection(randomVerticalDirection());
            setIceDemonNode(nextNode);
            setIsIceDemonMoving(false);
            setIsIceDemonLeaving(false);
          }, moveDelayMs);
        }
        return current;
      });
    }, nightTickMs);

    return () => window.clearInterval(interval);
  }, [groundDirection, isFireDemonNight, isFullMapMenuOpen, isIntroLetterOpen, isLost, isPaused, isWon, manaRitualTimeScale, nightHour, place, view]);

  useEffect(() => {
    if (!isLossPending || isLost) return;

    fullMapTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    fullMapTimeouts.current = [];
    setFullMapPhase("closed");
    setManaRitualPhase("closed");
    setIsIntroLetterOpen(false);
    setIsIntroLetterClosing(false);
    setIsIntroLetterPending(false);

    setIsLost(true);
    setIsLossPending(false);
  }, [isLossPending, isLost]);

  useEffect(() => {
    window.clearTimeout(fireDemonThreatTimeout.current);
    window.clearTimeout(iceDemonThreatTimeout.current);

    if (!isFireDemonNight || isLost || isWon || isPaused || isIntroLetterOpen) return;

    if (fireDemonNode === "center") {
      fireDemonThreatTimeout.current = window.setTimeout(() => {
        setIsLossPending(true);
      }, fireDemonReactionMs);
    }

    if (iceDemonNode === "center") {
      iceDemonThreatTimeout.current = window.setTimeout(() => {
        setIsLossPending(true);
      }, fireDemonReactionMs);
    }

    return () => {
      window.clearTimeout(fireDemonThreatTimeout.current);
      window.clearTimeout(iceDemonThreatTimeout.current);
    };
  }, [fireDemonNode, iceDemonNode, isFireDemonNight, isIntroLetterOpen, isLost, isPaused, isWon]);

  useEffect(() => {
    let timeout = 0;

    const changeView = (nextView: View, motion: TurnMotion) => {
      if (nextView === view) return;
      if (!canTurn.current) return;

      canTurn.current = false;
      setTurnMotion(motion);
      setTurnFrame((current) => current + 1);
      setTurning(true);
      setView(nextView);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setTurning(false), 260);
      window.clearTimeout(cooldownTimeout.current);
      cooldownTimeout.current = window.setTimeout(() => {
        canTurn.current = true;
      }, turnCooldownMs);
    };

    const turn = (step: -1 | 1) => {
      const index = viewOrder.indexOf(view === "up" ? direction : view);
      const nextIndex = (index + step + viewOrder.length) % viewOrder.length;
      const nextDirection = viewOrder[nextIndex];
      setDirection(nextDirection);
      changeView(nextDirection, step === -1 ? "left" : "right");
    };

    const handleKey = (event: KeyboardEvent) => {
      if (isWon || isLost) {
        setIsLeaving(true);
        window.setTimeout(onBack, 520);
        return;
      }

      if (event.code === "Escape") {
        if (isManaRitualActive) return;
        setIsPaused((current) => !current);
        return;
      }

      if (isPaused || isIntroLetterOpen) return;

      if (event.code === "KeyJ") {
        castFireSpell();
        return;
      }

      if (event.code === "KeyK") {
        castIceSpell();
        return;
      }

      if (fullMapPhase !== "closed") return;

      if (event.code === "KeyE" || event.code === "KeyQ") {
        if (isManaRitualActive) {
          closeManaRitual();
          return;
        }

        startManaRitual(event.code === "KeyQ" ? "external" : "elemental");
        return;
      }

      if (isManaRitualActive && !isManaRitualOpen) return;

      if (isManaRitualOpen) {
        const pressedLetter = pressedManaRitualLetter(event);
        if (!pressedLetter) return;
        pressManaRitualLetter(pressedLetter);
        return;
      }

      if (event.code === "KeyA" || event.code === "ArrowLeft") turn(-1);
      if (event.code === "KeyD" || event.code === "ArrowRight") turn(1);
      if (event.code === "KeyW" || event.code === "ArrowUp") changeView("up", "up");
      if (event.code === "KeyS" || event.code === "ArrowDown") changeView(direction, "down");
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", handleKey);
    };
  }, [direction, fullMapPhase, groundDirection, isIntroLetterOpen, isLost, isManaRitualActive, isManaRitualOpen, isPaused, isSpellActive, isWon, manaRitualLetter, manaRitualPhase, manaTargetSector, onBack, place, playerMana, showFireDemon, view]);

  useEffect(() => {
    return () => {
      window.clearTimeout(cooldownTimeout.current);
      window.clearTimeout(fireDemonThreatTimeout.current);
      window.clearTimeout(iceDemonThreatTimeout.current);
      fullMapTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      fireSpellTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    const handleMapKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyM" || event.repeat || isIntroLetterOpen || isManaRitualActive || isWon) return;

      if (fullMapPhase === "closed") {
        fullMapTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        fullMapTimeouts.current = [];
        setFullMapPhase("closingIn");
        fullMapTimeouts.current.push(window.setTimeout(() => setFullMapPhase("open"), 1000));
        return;
      }

      if (fullMapPhase === "open" || fullMapPhase === "closingIn") {
        closeFullMap();
      }
    };

    window.addEventListener("keydown", handleMapKey);
    return () => window.removeEventListener("keydown", handleMapKey);
  }, [fullMapPhase, isIntroLetterOpen, isManaRitualActive, isWon]);

  return (
    <main
      className={`forest-scene screen-fade forest-scene--${view}${turning ? ` forest-scene--turning forest-scene--turn-${turnMotion}` : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="moon" />
      <div className="forest-horizon" key={`horizon-${turnFrame}`} />
      <div className="forest-ground" />
      <div className="grass-pixels">
        {grassPixels(groundDirection).map((pixel, index) => (
          <span
            className={`grass-pixel grass-pixel--${pixel.color}`}
            key={index}
            style={{ left: pixel.left, top: pixel.top }}
          />
        ))}
      </div>
      <div className="tree-ring" key={`trees-${turnFrame}`}>
        {forestViews[groundDirection].map((tree, index) => (
          <div
            className={`moonlit-tree moonlit-tree--${tree.variant} moonlit-tree--${tree.layer}`}
            key={index}
            style={
              {
                "--tree-brightness": getTreeBrightness(tree.scale),
                left: tree.left,
                transform: `translateX(-50%) scale(${tree.scale}) rotate(${tree.tilt}deg)`,
              } as TreeStyle
            }
          >
            <img src={pixelSpruceImage} alt="" aria-hidden="true" draggable={false} />
          </div>
        ))}
      </div>
      {shouldRenderFireDemon && (
        <div className={`forest-fire-demon${isFireDemonLeaving ? " forest-fire-demon--leaving" : ""}`} aria-hidden="true">
          <img src={fireDemonImage} alt="" draggable={false} />
        </div>
      )}
      {shouldRenderIceDemon && (
        <div className={`forest-fire-demon forest-ice-demon${isIceDemonLeaving ? " forest-fire-demon--leaving" : ""}`} aria-hidden="true">
          <img src={iceDemonImage} alt="" draggable={false} />
        </div>
      )}
      <div className="first-person-vignette" />
      {isSpellActive && activeSpell && (
        <div className={`fire-spell fire-spell--${activeSpell} fire-spell--${fireSpellPhase}${activeSpellHitsTarget ? " fire-spell--hit-target" : ""}`} aria-hidden="true">
          <img className="fire-spell__hands" src={spellHandsImage} alt="" draggable={false} />
          {isSpellProjectileVisible && <span className={activeSpell === "fire" ? "fire-spell__orb" : "ice-spell__arrow"} />}
        </div>
      )}
      {iceImpactKey > 0 && activeSpell === "ice" && fireSpellPhase === "shooting" && (
        <div className="ice-impact" key={iceImpactKey} aria-hidden="true">
          <span className="ice-impact__burst" />
          <span className="ice-impact__shard ice-impact__shard--one" />
          <span className="ice-impact__shard ice-impact__shard--two" />
          <span className="ice-impact__shard ice-impact__shard--three" />
          <span className="ice-impact__shard ice-impact__shard--four" />
          <span className="ice-impact__shard ice-impact__shard--five" />
          <span className="ice-impact__shard ice-impact__shard--six" />
        </div>
      )}
      {fireImpactKey > 0 && activeSpell === "fire" && fireSpellPhase === "shooting" && (
        <div className="fire-impact" key={fireImpactKey} aria-hidden="true">
          <span className="fire-impact__burst" />
          <span className="fire-impact__ember fire-impact__ember--one" />
          <span className="fire-impact__ember fire-impact__ember--two" />
          <span className="fire-impact__ember fire-impact__ember--three" />
          <span className="fire-impact__ember fire-impact__ember--four" />
          <span className="fire-impact__ember fire-impact__ember--five" />
          <span className="fire-impact__ember fire-impact__ember--six" />
        </div>
      )}
      {manaRitualPhase !== "closed" && (
        <div className={`mana-ritual mana-ritual--${manaRitualPhase}`}>
          {isManaRitualOpen && (
            <div className="mana-ritual__content">
              <button
                type="button"
                className="mana-ritual__close"
                aria-label="Выйти из накопления маны"
                onTouchStart={closeMobileManaRitual}
                onMouseDown={closeMobileManaRitual}
              >
                <span aria-hidden="true" />
              </button>
              <div className="mana-ritual__mana">
                <span>{manaRitualKind === "external" ? "Внешняя мана" : "Стихийная мана"}</span>
                <strong>{manaRitualKind === "external" ? `${externalMana}/${maxExternalMana}` : `${playerMana}/${maxPlayerMana}`}</strong>
              </div>
              <div className={`mana-ritual__ring mana-ritual__ring--${manaRitualKind}`}>
                {Array.from({ length: activeManaRitualSectors }, (_, sector) => (
                  <span
                    className={`mana-ritual__sector${sector === manaTargetSector ? " mana-ritual__sector--target" : ""}`}
                    key={sector}
                    style={{ transform: `rotate(${sector * activeManaRitualSectorStepDegrees}deg)` }}
                  />
                ))}
                <span className="mana-ritual__arrow" ref={manaArrowRef} />
                <span className={`mana-ritual__inner mana-ritual__inner--${manaRitualLetter.toLowerCase()}`}>
                  <span>{manaRitualLetter}</span>
                  <span className="mana-ritual__direction-icon" aria-hidden="true" />
                </span>
              </div>
              <div className="mana-ritual-controls" aria-label="Управление ритуалом">
                <div className="mana-ritual-controls__side">
                  <button type="button" className="mana-ritual-control mana-ritual-control--up" aria-label="Вверх" onPointerDown={(event) => pressMobileManaRitualLetter(event, "W")} onClick={(event) => pressMobileManaRitualLetter(event, "W")}>
                    <span className="mana-ritual-control__icon" aria-hidden="true" />
                    <span className="mana-ritual-control__key">W</span>
                  </button>
                  <button type="button" className="mana-ritual-control mana-ritual-control--down" aria-label="Вниз" onPointerDown={(event) => pressMobileManaRitualLetter(event, "S")} onClick={(event) => pressMobileManaRitualLetter(event, "S")}>
                    <span className="mana-ritual-control__icon" aria-hidden="true" />
                    <span className="mana-ritual-control__key">S</span>
                  </button>
                </div>
                <div className="mana-ritual-controls__side">
                  <button type="button" className="mana-ritual-control mana-ritual-control--left" aria-label="Влево" onPointerDown={(event) => pressMobileManaRitualLetter(event, "A")} onClick={(event) => pressMobileManaRitualLetter(event, "A")}>
                    <span className="mana-ritual-control__icon" aria-hidden="true" />
                    <span className="mana-ritual-control__key">A</span>
                  </button>
                  <button type="button" className="mana-ritual-control mana-ritual-control--right" aria-label="Вправо" onPointerDown={(event) => pressMobileManaRitualLetter(event, "D")} onClick={(event) => pressMobileManaRitualLetter(event, "D")}>
                    <span className="mana-ritual-control__icon" aria-hidden="true" />
                    <span className="mana-ritual-control__key">D</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="health-hud" aria-label="Mana">
        <div className="forest-stat forest-stat--mana" aria-label={`Elemental mana ${playerMana} of ${maxPlayerMana}`}>
          <div className="forest-stat__top">
            <span>Стихийная мана</span>
            <strong>{playerMana}/{maxPlayerMana}</strong>
          </div>
          <div className="forest-stat__bar">
            <span style={{ width: `${manaPercent}%` }} />
          </div>
        </div>
        <div className="forest-stat forest-stat--external-mana" aria-label={`External mana ${externalMana} of ${maxExternalMana}`}>
          <div className="forest-stat__top">
            <span>Внешняя мана</span>
            <strong>{externalMana}/{maxExternalMana}</strong>
          </div>
          <div className="forest-stat__bar">
            <span style={{ width: `${externalManaPercent}%` }} />
          </div>
        </div>
      </div>
      <div className="spell-buttons" aria-label="Заклинания">
        <button type="button" className="spell-button spell-button--fire" onPointerDown={(event) => pressMobileGameKey(event, "KeyJ", "j")}>
          <span className="spell-button__pixel spell-button__pixel--fire-one" />
          <span className="spell-button__pixel spell-button__pixel--fire-two" />
          <span className="spell-button__pixel spell-button__pixel--fire-three" />
          <span className="spell-button__pixel spell-button__pixel--fire-four" />
          <span className="spell-button__key">J</span>
          <span className="spell-button__content">
            <span className="spell-button__title">Огненное заклинание</span>
            <span className="spell-button__text">Тратит 10 очков стихийной маны</span>
          </span>
        </button>
        <button type="button" className="spell-button spell-button--ice" onPointerDown={(event) => pressMobileGameKey(event, "KeyK", "k")}>
          <span className="spell-button__pixel spell-button__pixel--ice-one" />
          <span className="spell-button__pixel spell-button__pixel--ice-two" />
          <span className="spell-button__pixel spell-button__pixel--ice-three" />
          <span className="spell-button__pixel spell-button__pixel--ice-four" />
          <span className="spell-button__key">K</span>
          <span className="spell-button__content">
            <span className="spell-button__title">Ледяное заклинание</span>
            <span className="spell-button__text">Тратит 15 очков стихийной маны</span>
          </span>
        </button>
      </div>
      <div className="forest-key-buttons" aria-label="Действия">
        <button type="button" className="forest-key-button" onPointerDown={(event) => pressMobileGameKey(event, "KeyM", "m")}>
          <span className="spell-button__key">M</span>
          <span className="spell-button__content">
            <span className="spell-button__title">Карта</span>
            <span className="spell-button__text">Открывает карту леса</span>
          </span>
        </button>
        <button type="button" className="forest-key-button" onPointerDown={(event) => pressMobileGameKey(event, "KeyE", "e")}>
          <span className="spell-button__key">E</span>
          <span className="spell-button__content">
            <span className="spell-button__title">Стихийная мана</span>
            <span className="spell-button__text">Ритуал стихийной маны</span>
          </span>
        </button>
        <button type="button" className="forest-key-button" onPointerDown={(event) => pressMobileGameKey(event, "KeyQ", "q")}>
          <span className="spell-button__key">Q</span>
          <span className="spell-button__content">
            <span className="spell-button__title">Внешняя мана</span>
            <span className="spell-button__text">Ритуал внешней маны</span>
          </span>
        </button>
      </div>
      <div className="forest-mobile-controls" aria-label="Мобильное управление">
        <button type="button" className="forest-mobile-control forest-mobile-control--fire" aria-label="Огонь" onTouchStart={(event) => pressMobileGameKey(event, "KeyJ", "j")} onMouseDown={(event) => pressMobileGameKey(event, "KeyJ", "j")}>
          <span className="mobile-forest-icon mobile-forest-icon--fire" aria-hidden="true" />
        </button>
        <button type="button" className="forest-mobile-control forest-mobile-control--ice" aria-label="Лед" onTouchStart={(event) => pressMobileGameKey(event, "KeyK", "k")} onMouseDown={(event) => pressMobileGameKey(event, "KeyK", "k")}>
          <span className="mobile-forest-icon mobile-forest-icon--ice" aria-hidden="true" />
        </button>
        <button type="button" className="forest-mobile-control forest-mobile-control--map" aria-label="Карта" onTouchStart={(event) => pressMobileGameKey(event, "KeyM", "m")} onMouseDown={(event) => pressMobileGameKey(event, "KeyM", "m")}>
          <span className="mobile-forest-icon mobile-forest-icon--map" aria-hidden="true" />
        </button>
        <button type="button" className="forest-mobile-control forest-mobile-control--mana" aria-label="Стихийная мана" onTouchStart={(event) => pressMobileGameKey(event, "KeyE", "e")} onMouseDown={(event) => pressMobileGameKey(event, "KeyE", "e")}>
          <span className="mobile-forest-icon mobile-forest-icon--mana" aria-hidden="true" />
        </button>
        <button type="button" className="forest-mobile-control forest-mobile-control--external" aria-label="Внешняя мана" onTouchStart={(event) => pressMobileGameKey(event, "KeyQ", "q")} onMouseDown={(event) => pressMobileGameKey(event, "KeyQ", "q")}>
          <span className="mobile-forest-icon mobile-forest-icon--external" aria-hidden="true" />
        </button>
      </div>
      <div className="view-label">
        <span>
          {view === "north" && text("north")}
          {view === "east" && text("east")}
          {view === "south" && text("south")}
          {view === "west" && text("west")}
          {view === "up" && text("up")}
        </span>
        <strong>{clockText}</strong>
      </div>
      {fullMapPhase !== "closed" && (
        <div className={`full-map-overlay full-map-overlay--${fullMapPhase}`}>
          {fullMapPhase === "open" && (
            <>
              <button type="button" className="overlay-close-button" aria-label="Закрыть карту" onTouchStart={(event) => closeOverlayButton(event, closeFullMap)} onMouseDown={(event) => closeOverlayButton(event, closeFullMap)}>
                <span aria-hidden="true" />
              </button>
              <section className="full-forest-map" aria-hidden="true">
                <span className="full-map-label full-map-label--north">Север</span>
                <span className="full-map-label full-map-label--east">Восток</span>
                <span className="full-map-label full-map-label--south">Юг</span>
                <span className="full-map-label full-map-label--west">Запад</span>
                <span className="full-map-road full-map-road--vertical" />
                <span className="full-map-road full-map-road--horizontal" />
                <span className="full-map-edge full-map-edge--top" />
                <span className="full-map-edge full-map-edge--right" />
                <span className="full-map-edge full-map-edge--bottom" />
                <span className="full-map-edge full-map-edge--left" />
                <span className="full-map-node full-map-node--center" />
                <span className="full-map-node full-map-node--north" />
                <span className="full-map-node full-map-node--east" />
                <span className="full-map-node full-map-node--south" />
                <span className="full-map-node full-map-node--west" />
                <span className="full-map-corner full-map-corner--north-west" />
                <span className="full-map-corner full-map-corner--north-east" />
                <span className="full-map-corner full-map-corner--south-west" />
                <span className="full-map-corner full-map-corner--south-east" />
                {isFireDemonNight && <span className={`full-map-red-demon full-map-red-demon--${fireDemonNode}${isFireDemonMoving ? " full-map-red-demon--moving" : ""}`} />}
                {isFireDemonNight && <span className={`full-map-red-demon full-map-ice-demon full-map-red-demon--${iceDemonNode}${isIceDemonMoving ? " full-map-red-demon--moving" : ""}`} />}
                <span className={`full-map-player full-map-player--${place}`} />
              </section>
            </>
          )}
        </div>
      )}
      {isWon && (
        <div className={`night-win${isLeaving ? " night-win--leaving" : ""}`}>
          <div className="night-win-stars" />
          <section className="night-win-panel">
            <h2>6.00</h2>
            <p>{text("youWon")}</p>
            <span>{text("winHint")}</span>
          </section>
        </div>
      )}
      {isLost && (
        <div className={`night-lose-scene${isLeaving ? " night-win--leaving" : ""}`}>
          <div className="lose-run-forest">
            {Array.from({ length: 90 }, (_, index) => (
              <img
                className={`lose-run-tree lose-run-tree--${index % 3}`}
                src={pixelSpruceImage}
                alt=""
                aria-hidden="true"
                draggable={false}
                key={index}
                style={{ left: `${-4 + index * 4}%` }}
              />
            ))}
          </div>
          <div className="lose-forest-shadows" />
          <img className="lose-demon lose-demon--fire-one" src={fireDemonImage} alt="" aria-hidden="true" draggable={false} />
          <img className="lose-demon lose-demon--ice-one" src={iceDemonImage} alt="" aria-hidden="true" draggable={false} />
          <img className="lose-demon lose-demon--fire-two" src={fireDemonImage} alt="" aria-hidden="true" draggable={false} />
          <img className="lose-demon lose-demon--ice-two" src={iceDemonImage} alt="" aria-hidden="true" draggable={false} />
          <img className="lose-demon lose-demon--dark" src={darkDemonImage} alt="" aria-hidden="true" draggable={false} />
          <div className="lose-attack-flash" />
          <section className="night-win-panel night-lose-text">
            <h2>12.00</h2>
            <p>{text("youLost")}</p>
            <span>{text("lostHint")}</span>
          </section>
        </div>
      )}
      {isIntroLetterOpen && (
        <div className={`night-letter-overlay${isIntroLetterClosing ? " night-letter-overlay--closing" : ""}`}>
          <section className={`night-letter-page${isIntroLetterClosing ? " night-letter-page--closing" : ""}`}>
            <p>
              Здравствуйте! Если вы читаете это письмо,<br />
              значит, вы согласны с условиями нашей работы.<br />
              В лесу есть демоны, и вы должны не дать им<br />
              добраться до энергетического ядра леса:<br />
              их привлекает его излучение.<br />
              Адрес, где вы можете забрать деньги:<br />
              улица Пушкина, дом 5, квартира 15.
            </p>
            <p>Надеюсь, вы сможете защитить ядро.</p>
            <button
              type="button"
              className="night-letter-arrow"
              aria-label="Продолжить"
              onClick={() => {
                if (isIntroLetterClosing) return;

                setIsIntroLetterClosing(true);
                window.setTimeout(() => {
                  setIsIntroLetterOpen(false);
                  setIsIntroLetterClosing(false);
                  setIsIntroLetterDone(true);
                }, 620);
              }}
            />
          </section>
        </div>
      )}
      {isPaused && (
        <div className="night-pause">
          <section className="night-pause-panel">
            <button type="button" className="overlay-close-button overlay-close-button--panel" aria-label="Закрыть меню" onClick={() => setIsPaused(false)}>
              <span aria-hidden="true" />
            </button>
            <h2>{text("pause")}</h2>
            <label>
              <span>{text("language")}</span>
              <button type="button" onClick={() => setSave({ ...save, language: save.language === "ru" ? "en" : "ru" })}>
                {save.language === "ru" ? text("switchToEnglish") : text("switchToRussian")}
              </button>
            </label>
            <label>
              <span>{save.language === "ru" ? "Общая громкость" : "Master volume"}</span>
              <input type="range" min="0" max="1" step="0.05" value={save.volume} onChange={(event) => setSave({ ...save, volume: Number(event.target.value) })} />
            </label>
            <label>
              <span>{text("music")}</span>
              <input type="range" min="0" max="1" step="0.05" value={save.music} onChange={(event) => setSave({ ...save, music: Number(event.target.value) })} />
            </label>
            <label>
              <span>{text("effects")}</span>
              <input type="range" min="0" max="1" step="0.05" value={save.effects} onChange={(event) => setSave({ ...save, effects: Number(event.target.value) })} />
            </label>
            <button type="button" onClick={() => { setNightHour(6); setIsPaused(false); setIsWon(true); }}>
              Победа
            </button>
            <button type="button" onClick={() => setIsPaused(false)}>{text("resume")}</button>
            <button type="button" className="secondary" onClick={onBack}>{text("mainMenu")}</button>
          </section>
        </div>
      )}
    </main>
  );
}
