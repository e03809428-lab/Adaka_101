import { useEffect, useRef, useState } from "react";
import { playSound, setSlideSound, startMusic, stopMusic } from "./audio";
import { hit, playerBox } from "./physics";
import type { Level, Rect, SaveData, Turret, Vec } from "./types";

type Props = {
  level: Level;
  save: SaveData;
  onPause: () => void;
  onWin: (time: number) => void;
};

type Body = {
  pos: Vec;
  vel: Vec;
  ground: boolean;
  touchingWall: -1 | 0 | 1;
  facing: -1 | 1;
  dashUntil: number;
  dashReadyAt: number;
};

type Shot = Rect & {
  id: number;
  vel: Vec;
  kind: Turret["projectile"];
  bounces: number;
};

export function GameView({ level, save, onPause, onWin }: Props) {
  const keys = useRef(new Set<string>());
  const jumpHeld = useRef(false);
  const checkpoint = useRef(level.start);
  const started = useRef(performance.now());
  const last = useRef(performance.now());
  const won = useRef(false);
  const body = useRef<Body>(createBody(level.start));
  const [tick, setTick] = useState(0);
  const [cameraX, setCameraX] = useState(0);
  const [broken, setBroken] = useState<string[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const lastShot = useRef<Record<number, number>>({});
  const wasGrounded = useRef(false);

  useEffect(() => {
    startMusic(save);
    function down(event: KeyboardEvent) {
      if (event.code === "Escape") {
        playSound("pause", save);
        onPause();
      }
      keys.current.add(event.code);
    }
    function up(event: KeyboardEvent) {
      keys.current.delete(event.code);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      setSlideSound(false, save);
      stopMusic();
    };
  }, [onPause, save]);

  useEffect(() => {
    let frame = 0;
    function loop(now: number) {
      const dt = Math.min(32, now - last.current) / 1000;
      last.current = now;
      step(dt, now);
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  });

  function step(dt: number, now: number) {
    const b = body.current;
    const isDashing = now < b.dashUntil;
    const isSliding = !b.ground && b.touchingWall !== 0 && keys.current.has(save.keys.action);

    if (keys.current.has("ShiftLeft") && now >= b.dashReadyAt && !isDashing) {
      b.dashUntil = now + 180;
      b.dashReadyAt = now + 1000;
      b.vel.y = 0;
      playSound("dash", save, b.facing * 0.25);
    }

    b.vel.x = 0;
    if (isDashing) {
      b.vel.x = b.facing * 920;
    } else {
      if (keys.current.has(save.keys.left)) {
        b.vel.x = -330;
        b.facing = -1;
      }
      if (keys.current.has(save.keys.right)) {
        b.vel.x = 330;
        b.facing = 1;
      }
    }

    const jumpPressed = keys.current.has("Space");
    const wantsJump = jumpPressed && !jumpHeld.current;
    jumpHeld.current = jumpPressed;
    if (wantsJump && b.ground) {
      b.vel.y = -620;
      b.ground = false;
      playSound("jump", save);
    }
    if (wantsJump && isSliding) {
      b.vel.x = -b.touchingWall * 520;
      b.vel.y = -620;
      b.ground = false;
      b.facing = b.touchingWall === 1 ? -1 : 1;
      playSound("wallJump", save, b.facing * 0.25);
    }

    b.vel.y += 1450 * dt;
    if (isSliding && b.vel.y > 130) b.vel.y = 130;
    setSlideSound(isSliding, save);

    const moving = activeMovingPlatforms(now);
    const crumble = (level.crumblePlatforms ?? []).filter((item) => !broken.includes(item.id));
    const solids = [...level.platforms, ...moving, ...crumble];
    move(b, { x: b.vel.x * dt, y: 0 }, solids);
    move(b, { x: 0, y: b.vel.y * dt }, solids);

    for (const platform of crumble) {
      if (hit(playerBox(b.pos), platform)) {
        window.setTimeout(() => setBroken((current) => [...new Set([...current, platform.id])]), platform.delay);
      }
    }
    for (const pad of level.bouncePads ?? []) {
      if (hit(playerBox(b.pos), pad)) {
        b.vel = pad.power;
        playSound("jump", save);
      }
    }
    for (const point of level.checkpoints ?? []) {
      if (hit(playerBox(b.pos), point) && checkpoint.current.x !== point.x) {
        checkpoint.current = { x: point.x, y: point.y - 32 };
        playSound("checkpoint", save);
      }
    }
    if (touchingDanger(now) || enemyRects(now).some((enemy) => hit(playerBox(b.pos), enemy)) || b.pos.y > 820) respawn();
    fireTurrets(now);
    updateShots(dt);
    if (!won.current && hit(playerBox(b.pos), level.exit)) {
      won.current = true;
      playSound("win", save);
      onWin(Math.round((now - started.current) / 1000));
    }
    if (!wasGrounded.current && b.ground) playSound("land", save);
    wasGrounded.current = b.ground;

    setCameraX((current) => current + (getCameraTarget(b.pos.x) - current) * 0.12);
    setTick(now - started.current);
  }

  function move(b: Body, delta: Vec, solids: Rect[]) {
    b.pos = { x: b.pos.x + delta.x, y: b.pos.y + delta.y };
    if (delta.y !== 0) b.ground = false;
    if (delta.x !== 0) b.touchingWall = 0;

    for (const solid of solids) {
      if (!hit(playerBox(b.pos), solid)) continue;
      if (delta.y > 0) {
        b.pos.y = solid.y - 32;
        b.vel.y = 0;
        b.ground = true;
      }
      if (delta.y < 0) b.vel.y = 0;
      if (delta.x > 0) {
        b.pos.x = solid.x - 32;
        b.touchingWall = 1;
      }
      if (delta.x < 0) {
        b.pos.x = solid.x + solid.w;
        b.touchingWall = -1;
      }
    }
  }

  function respawn() {
    playSound("death", save);
    body.current = createBody(checkpoint.current);
  }

  function touchingDanger(now: number) {
    const box = playerBox(body.current.pos);
    const lasersOn = Math.floor(now / 1200) % 2 === 0;
    return (
      level.hazards?.some((hazard) => hit(box, hazard)) ||
      (lasersOn && level.lasers?.some((laser) => hit(box, laser)))
    );
  }

  function activeMovingPlatforms(now: number): Rect[] {
    return (level.movingPlatforms ?? []).map((platform) => {
      const offset = Math.sin(now / 1000 * (platform.speed / 80)) * platform.distance;
      return {
        ...platform,
        x: platform.axis === "x" ? platform.x + offset : platform.x,
        y: platform.axis === "y" ? platform.y + offset : platform.y,
      };
    });
  }

  function enemyRects(now: number): Rect[] {
    return (level.enemies ?? []).map((enemy) => {
      if (enemy.kind === "runner") {
        const offset = Math.sin(now / 1000 * (enemy.speed / 45)) * enemy.range;
        return { ...enemy, x: enemy.x + offset };
      }
      if (enemy.kind === "jumper") {
        const phase = (now % enemy.interval) / enemy.interval;
        const jump = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI) * -120 : 0;
        const drift = body.current.pos.x > enemy.x ? 38 : -38;
        return { ...enemy, x: enemy.x + drift * Math.max(0, 1 - phase), y: enemy.y + jump };
      }
      const dx = body.current.pos.x - enemy.x;
      const dy = body.current.pos.y - enemy.y;
      const near = Math.hypot(dx, dy) < enemy.range;
      return {
        ...enemy,
        x: near ? enemy.x + Math.sign(dx) * Math.min(Math.abs(dx), enemy.speed) : enemy.x,
        y: near ? enemy.y + Math.sign(dy) * Math.min(Math.abs(dy), enemy.speed) : enemy.y,
      };
    });
  }

  function fireTurrets(now: number) {
    for (const [index, turret] of (level.turrets ?? []).entries()) {
      const ready = now - (lastShot.current[index] ?? 0) > turret.cooldown;
      const playerNear = Math.abs(body.current.pos.x - turret.x) < 620 && Math.abs(body.current.pos.y - turret.y) < 360;
      if (!ready || !playerNear) continue;
      lastShot.current[index] = now;
      playSound("turretLock", save, turret.x < body.current.pos.x ? -0.5 : 0.5);
      window.setTimeout(() => playSound("turretCharge", save, turret.x < body.current.pos.x ? -0.5 : 0.5), 120);
      const count = turret.kind === "burst" ? 3 : 1;
      for (let i = 0; i < count; i += 1) {
        window.setTimeout(() => spawnShot(turret, now + i), i * 180);
      }
    }
  }

  function spawnShot(turret: Turret, seed: number) {
    const speed = turret.projectile === "fast" ? 620 : turret.projectile === "slow" ? 190 : 340;
    setShots((current) => [
      ...current,
      {
        id: seed,
        x: turret.x + turret.w / 2,
        y: turret.y + turret.h / 2,
        w: turret.projectile === "fast" ? 18 : 22,
        h: turret.projectile === "fast" ? 18 : 22,
        vel: { x: turret.direction.x * speed, y: turret.direction.y * speed },
        kind: turret.projectile,
        bounces: turret.projectile === "bounce" ? 3 : 0,
      },
    ]);
    playSound("turretShot", save, turret.x < body.current.pos.x ? -0.6 : 0.6);
  }

  function updateShots(dt: number) {
    setShots((current) => {
      const next: Shot[] = [];
      for (const shot of current) {
        const moved = {
          ...shot,
          x: shot.x + shot.vel.x * dt,
          y: shot.y + shot.vel.y * dt,
        };
        if (shot.kind === "homing") {
          const dx = body.current.pos.x - shot.x;
          const dy = body.current.pos.y - shot.y;
          moved.vel = {
            x: shot.vel.x + Math.sign(dx) * 90 * dt,
            y: shot.vel.y + Math.sign(dy) * 90 * dt,
          };
        }
        if (hit(playerBox(body.current.pos), moved)) {
          respawn();
          continue;
        }
        const wall = level.platforms.find((solid) => hit(moved, solid));
        if (wall && moved.bounces <= 0) {
          playSound("bulletHit", save);
          continue;
        }
        if (wall && moved.bounces > 0) {
          moved.vel = { x: -moved.vel.x, y: -moved.vel.y };
          moved.bounces -= 1;
        }
        if (moved.x > -80 && moved.x < 2000 && moved.y > -80 && moved.y < 820) {
          next.push(moved);
        }
      }
      return next;
    });
  }

  const playerSliding = !body.current.ground && body.current.touchingWall !== 0 && keys.current.has(save.keys.action);
  const dashReady = performance.now() >= body.current.dashReadyAt;

  return (
    <main className="game-screen">
      <div className="game-ui">
        <strong>{(tick / 1000).toFixed(1)} сек</strong>
        <span>Dash: {dashReady ? "готов" : "заряд"}</span>
        <button type="button" onClick={onPause}>↻</button>
      </div>
      <section className="game-viewport">
        <div className="world" style={{ transform: `scale(0.5) translateX(${-cameraX}px)` }}>
          {level.platforms.map((p, i) => <div className="platform" key={i} style={rect(p)} />)}
          {activeMovingPlatforms(performance.now()).map((p, i) => <div className="platform platform--moving" key={i} style={rect(p)} />)}
          {(level.crumblePlatforms ?? []).filter((p) => !broken.includes(p.id)).map((p) => <div className="platform platform--crumble" key={p.id} style={rect(p)} />)}
          {level.bouncePads?.map((p, i) => <div className="bounce-pad" key={i} style={rect(p)} />)}
          {level.checkpoints?.map((p, i) => <div className="checkpoint" key={i} style={rect(p)} />)}
          {level.hazards?.map((h, i) => <div className="hazard" key={i} style={rect(h)} />)}
          {level.lasers?.map((h, i) => <div className="laser" key={i} style={rect(h)} />)}
          {enemyRects(performance.now()).map((enemy, i) => <div className="enemy" key={i} style={rect(enemy)} />)}
          {level.turrets?.map((turret, i) => <div className={`turret turret--${turret.kind}`} key={i} style={rect(turret)} />)}
          {shots.map((shot) => <div className={`shot shot--${shot.kind}`} key={shot.id} style={rect(shot)} />)}
          <div className="portal" style={rect(level.exit)} />
          <div className={`player ${playerSliding ? "player--slide" : ""}`} style={posStyle(body.current.pos)} />
        </div>
      </section>
      <div className="level-name">{level.name}</div>
    </main>
  );
}

function createBody(pos: Vec): Body {
  return {
    pos,
    vel: { x: 0, y: 0 },
    ground: false,
    touchingWall: 0,
    facing: 1,
    dashUntil: 0,
    dashReadyAt: 0,
  };
}

function rect(rectangle: Rect) {
  return { left: rectangle.x, top: rectangle.y, width: rectangle.w, height: rectangle.h };
}

function posStyle(pos: Vec) {
  return { left: pos.x, top: pos.y };
}

function getCameraTarget(playerX: number) {
  return Math.max(0, Math.min(980, playerX - 480));
}
