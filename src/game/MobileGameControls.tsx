import { useRef, useState, type PointerEvent } from "react";

export type ControlCode = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "Space" | "ShiftLeft";

type MobileGameControlsProps = {
  onControl: (code: ControlCode, active: boolean) => void;
};

type StickState = {
  x: number;
  y: number;
  active: boolean;
};

const joystickCodes: ControlCode[] = ["ArrowLeft", "ArrowRight", "ArrowUp"];
const stickLimit = 34;
const deadZone = 14;

export function MobileGameControls({ onControl }: MobileGameControlsProps) {
  const stickRef = useRef<HTMLButtonElement | null>(null);
  const [stick, setStick] = useState<StickState>({ x: 0, y: 0, active: false });

  const releaseJoystick = (event?: PointerEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    for (const code of joystickCodes) onControl(code, false);
    setStick({ x: 0, y: 0, active: false });
  };

  const moveJoystick = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = stickRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > stickLimit ? stickLimit / distance : 1;
    const x = rawX * scale;
    const y = rawY * scale;

    onControl("ArrowLeft", x < -deadZone);
    onControl("ArrowRight", x > deadZone);
    onControl("ArrowUp", y < -deadZone);
    setStick({ x, y, active: true });
  };

  const pressJump = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onControl("Space", true);
  };

  const releaseJump = (event?: PointerEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    onControl("Space", false);
  };

  return (
    <div className="mobile-controls" aria-label="Управление">
      <button
        type="button"
        className={`mobile-joystick${stick.active ? " mobile-joystick--active" : ""}`}
        aria-label="Движение"
        ref={stickRef}
        onPointerDown={moveJoystick}
        onPointerMove={moveJoystick}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
        onLostPointerCapture={() => releaseJoystick()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="mobile-joystick__mark mobile-joystick__mark--left" />
        <span className="mobile-joystick__mark mobile-joystick__mark--right" />
        <span className="mobile-joystick__mark mobile-joystick__mark--up" />
        <span className="mobile-joystick__thumb" style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
      </button>
      <button
        type="button"
        className="mobile-jump-button"
        aria-label="Прыжок"
        onPointerDown={pressJump}
        onPointerUp={releaseJump}
        onPointerCancel={releaseJump}
        onLostPointerCapture={() => releaseJump()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="mobile-control-icon mobile-control-icon--jump" aria-hidden="true" />
      </button>
    </div>
  );
}
