import { useEffect, useState } from "react";
import pixelSpruceImage from "../assets/pixel-spruce-green.png";
import { startNightForestAmbience, stopNightForestAmbience } from "../game/audio";
import type { SaveData } from "../game/types";
import "../game/game.css";

type Direction = "north" | "east" | "south" | "west";
type View = Direction | "up";
type TreeVariant = "thin" | "wide" | "tall" | "dark" | "pale";
type ForestTree = { left: string; scale: number; tilt: number; layer: "back" | "mid" | "front"; variant: TreeVariant };

type Props = {
  onBack: () => void;
  save: SaveData;
};

const viewOrder: Direction[] = ["north", "east", "south", "west"];
const grassSeeds: Record<Direction, number> = { north: 19, east: 43, south: 71, west: 107 };

function grassPixels(direction: Direction) {
  const seed = grassSeeds[direction];
  return Array.from({ length: 780 }, (_, index) => ({
    left: `${(index * 29 + seed * 7 + (index % 23) * 11) % 100}%`,
    top: `${8 + ((index * 31 + seed * 13 + (index % 19) * 5) % 88)}%`,
    color: (index * 5 + seed + (index % 11)) % 12,
  }));
}

const forestViews: Record<Direction, ForestTree[]> = {
  north: [
    { left: "7%", scale: 0.9, tilt: 5, layer: "back", variant: "thin" },
    { left: "19%", scale: 1.24, tilt: -3, layer: "front", variant: "wide" },
    { left: "33%", scale: 1.0, tilt: 4, layer: "mid", variant: "pale" },
    { left: "49%", scale: 1.34, tilt: -2, layer: "front", variant: "tall" },
    { left: "63%", scale: 0.94, tilt: 3, layer: "back", variant: "dark" },
    { left: "78%", scale: 1.16, tilt: -6, layer: "mid", variant: "thin" },
    { left: "94%", scale: 1.28, tilt: 2, layer: "front", variant: "wide" },
  ],
  east: [
    { left: "3%", scale: 1.3, tilt: -7, layer: "front", variant: "tall" },
    { left: "14%", scale: 0.88, tilt: 2, layer: "back", variant: "dark" },
    { left: "26%", scale: 1.08, tilt: -4, layer: "mid", variant: "wide" },
    { left: "44%", scale: 0.96, tilt: 5, layer: "back", variant: "thin" },
    { left: "57%", scale: 1.36, tilt: 1, layer: "front", variant: "wide" },
    { left: "74%", scale: 1.02, tilt: -5, layer: "mid", variant: "pale" },
    { left: "89%", scale: 1.18, tilt: 7, layer: "front", variant: "thin" },
    { left: "103%", scale: 0.92, tilt: -2, layer: "back", variant: "dark" },
  ],
  south: [
    { left: "-2%", scale: 1.22, tilt: 2, layer: "front", variant: "dark" },
    { left: "12%", scale: 0.86, tilt: -6, layer: "back", variant: "thin" },
    { left: "24%", scale: 1.44, tilt: 4, layer: "front", variant: "tall" },
    { left: "39%", scale: 1.02, tilt: -2, layer: "mid", variant: "pale" },
    { left: "58%", scale: 1.26, tilt: 5, layer: "front", variant: "wide" },
    { left: "70%", scale: 0.94, tilt: -7, layer: "back", variant: "dark" },
    { left: "84%", scale: 1.12, tilt: 3, layer: "mid", variant: "thin" },
    { left: "99%", scale: 1.34, tilt: -4, layer: "front", variant: "tall" },
  ],
  west: [
    { left: "1%", scale: 1.12, tilt: 4, layer: "mid", variant: "pale" },
    { left: "11%", scale: 1.38, tilt: -3, layer: "front", variant: "wide" },
    { left: "29%", scale: 0.9, tilt: 6, layer: "back", variant: "dark" },
    { left: "42%", scale: 1.3, tilt: -5, layer: "front", variant: "thin" },
    { left: "56%", scale: 1.04, tilt: 2, layer: "mid", variant: "tall" },
    { left: "73%", scale: 1.2, tilt: -6, layer: "front", variant: "wide" },
    { left: "86%", scale: 0.98, tilt: 5, layer: "back", variant: "thin" },
    { left: "98%", scale: 1.1, tilt: -2, layer: "mid", variant: "dark" },
  ],
};

export function NightForestScene({ onBack, save }: Props) {
  const [direction, setDirection] = useState<Direction>("north");
  const [view, setView] = useState<View>("north");
  const [turning, setTurning] = useState(false);
  const groundDirection = view === "up" ? direction : view;

  useEffect(() => {
    startNightForestAmbience(save);
    return () => stopNightForestAmbience();
  }, [save]);

  useEffect(() => {
    let timeout = 0;

    const changeView = (nextView: View) => {
      if (nextView === view) return;
      setTurning(true);
      setView(nextView);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setTurning(false), 260);
    };

    const turn = (step: -1 | 1) => {
      const index = viewOrder.indexOf(view === "up" ? direction : view);
      const nextIndex = (index + step + viewOrder.length) % viewOrder.length;
      const nextDirection = viewOrder[nextIndex];
      setDirection(nextDirection);
      changeView(nextDirection);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "KeyA" || event.code === "ArrowLeft") turn(-1);
      if (event.code === "KeyD" || event.code === "ArrowRight") turn(1);
      if (event.code === "KeyW" || event.code === "ArrowUp") changeView("up");
      if (event.code === "KeyS" || event.code === "ArrowDown") changeView(direction);
      if (event.code === "Escape") onBack();
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", handleKey);
    };
  }, [direction, onBack, view]);

  return (
    <main className={`forest-scene forest-scene--${view}${turning ? " forest-scene--turning" : ""}`}>
      <button type="button" className="night-back-button" onClick={onBack}>Главное меню</button>
      <div className="moon" />
      <div className="forest-horizon" />
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
      <div className="tree-ring">
        {forestViews[groundDirection].map((tree, index) => (
          <div
            className={`moonlit-tree moonlit-tree--${tree.variant} moonlit-tree--${tree.layer}`}
            key={index}
            style={{ left: tree.left, transform: `translateX(-50%) scale(${tree.scale}) rotate(${tree.tilt}deg)` }}
          >
            <img src={pixelSpruceImage} alt="" aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="first-person-vignette" />
      <div className="view-label">
        {view === "north" && "Север"}
        {view === "east" && "Восток"}
        {view === "south" && "Юг"}
        {view === "west" && "Запад"}
        {view === "up" && "Вверх"}
      </div>
    </main>
  );
}
