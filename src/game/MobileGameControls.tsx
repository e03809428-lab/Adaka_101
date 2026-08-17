import { useRef } from "react";

export type ControlCode = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "Space" | "ShiftLeft";

type MobileGameControlsProps = {
  onControl: (code: ControlCode, active: boolean) => void;
};

export function MobileGameControls({ onControl }: MobileGameControlsProps) {
  const activeTouches = useRef(new Set<ControlCode>());

  const releaseAll = () => {
    for (const code of controlCodes) {
      onControl(code, false);
    }
    activeTouches.current.clear();
  };

  const syncTouches = (touches: React.TouchList) => {
    const next = getTouchCodes(touches);
    for (const code of controlCodes) {
      const active = next.has(code);
      if (activeTouches.current.has(code) !== active) {
        onControl(code, active);
      }
    }
    activeTouches.current = next;
  };

  return (
    <div
      className="mobile-controls"
      aria-label="Управление"
      onTouchStart={(event) => {
        event.preventDefault();
        syncTouches(event.touches);
      }}
      onTouchMove={(event) => {
        event.preventDefault();
        syncTouches(event.touches);
      }}
      onTouchEnd={(event) => {
        event.preventDefault();
        syncTouches(event.touches);
      }}
      onTouchCancel={releaseAll}
    >
      <div className="mobile-controls__move">
        <ControlButton label="Влево" icon="left" code="ArrowLeft" kind="move" onControl={onControl} />
        <ControlButton label="Вправо" icon="right" code="ArrowRight" kind="move" onControl={onControl} />
      </div>
      <div className="mobile-controls__actions">
        <ControlButton label="Вверх" icon="up" code="ArrowUp" kind="small" onControl={onControl} />
        <ControlButton label="Прыжок" icon="jump" code="Space" kind="jump" onControl={onControl} />
        <ControlButton label="Рывок" icon="dash" code="ShiftLeft" kind="small" onControl={onControl} />
      </div>
    </div>
  );
}

const controlCodes: ControlCode[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "ShiftLeft"];

type ControlButtonProps = {
  label: string;
  icon: "left" | "right" | "up" | "jump" | "dash";
  code: ControlCode;
  kind: "move" | "jump" | "small";
  onControl: (code: ControlCode, active: boolean) => void;
};

function ControlButton({ label, icon, code, kind, onControl }: ControlButtonProps) {
  const press = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    onControl(code, true);
  };

  const release = (event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    event?.preventDefault();
    event?.stopPropagation();
    onControl(code, false);
  };

  return (
    <button
      type="button"
      className={`mobile-control-button mobile-control-button--${kind}`}
      data-control-code={code}
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={() => release()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className={`mobile-control-icon mobile-control-icon--${icon}`} aria-hidden="true" />
    </button>
  );
}

function getTouchCodes(touches: React.TouchList) {
  const codes = new Set<ControlCode>();
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (!touch) continue;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const button = element?.closest<HTMLButtonElement>("[data-control-code]");
    const code = button?.dataset.controlCode;
    if (isControlCode(code)) {
      codes.add(code);
    }
  }
  return codes;
}

function isControlCode(code: string | undefined): code is ControlCode {
  return controlCodes.includes(code as ControlCode);
}
