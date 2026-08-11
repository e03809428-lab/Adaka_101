import { useEffect, useState } from "react";
import { playSound } from "../game/audio";
import { GameView } from "../game/GameView";
import { levels } from "../game/levels";
import { loadSave, storeSave } from "../game/save";
import type { SaveData } from "../game/types";
import "../game/game.css";

type Screen = "menu" | "levels" | "settings" | "about" | "play" | "pause" | "win";

export function HomePage() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>("menu");
  const [levelId, setLevelId] = useState(1);
  const [result, setResult] = useState({ time: 0 });

  useEffect(() => storeSave(save), [save]);

  const level = levels.find((item) => item.id === levelId) ?? levels[0];

  function win(time: number) {
    setResult({ time });
    setSave((current) => ({
      ...current,
      completed: [...new Set([...current.completed, level.id])],
      bestTimes: {
        ...current.bestTimes,
        [level.id]: Math.min(current.bestTimes[level.id] ?? time, time),
      },
    }));
    setScreen("win");
  }

  if (screen === "play") {
    return <GameView key={level.id} level={level} save={save} onPause={() => setScreen("pause")} onWin={win} />;
  }

  return (
    <main className="shell">
      <section className="panel">
        {screen === "menu" && <Menu onOpen={setScreen} />}
        {screen === "levels" && <LevelSelect save={save} onBack={() => setScreen("menu")} onPlay={(id) => { setLevelId(id); setScreen("play"); }} />}
        {screen === "settings" && <Settings save={save} setSave={setSave} onBack={() => setScreen("menu")} />}
        {screen === "about" && <About onBack={() => setScreen("menu")} />}
        {screen === "pause" && <Pause onOpen={setScreen} onRestart={() => setScreen("play")} />}
        {screen === "win" && <Win result={result} next={() => { setLevelId(Math.min(levelId + 1, levels.length)); setScreen("play"); }} replay={() => setScreen("play")} />}
      </section>
    </main>
  );
}

function Menu({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const save = loadSave();
  const open = (screen: Screen) => {
    playSound("click", save);
    onOpen(screen);
  };
  return (
    <>
      <h1>Игра Егора</h1>
      <p>Минималистичный паркур-платформер про wall jump, dash и скорость.</p>
      <button onClick={() => open("levels")}>Играть</button>
      <button onClick={() => open("settings")}>Настройки</button>
      <button onClick={() => open("about")}>Об игре</button>
      <button onClick={() => { playSound("click", save); window.close(); }}>Выход</button>
    </>
  );
}

function LevelSelect({ save, onBack, onPlay }: { save: SaveData; onBack: () => void; onPlay: (id: number) => void }) {
  return (
    <>
      <h2>Выбор уровней</h2>
      <div className="level-grid">
        {levels.map((level) => {
          const unlocked = level.id === 1 || save.completed.includes(level.id - 1);
          return (
            <button className="level-card" disabled={!unlocked} key={level.id} onClick={() => { playSound("select", save); onPlay(level.id); }}>
              <strong>Уровень {level.id}</strong>
              <span>{save.completed.includes(level.id) ? "пройден" : "не пройден"}</span>
              <small>лучшее: {save.bestTimes[level.id] ? `${save.bestTimes[level.id]} сек` : "-"}</small>
            </button>
          );
        })}
      </div>
      <button className="secondary" onClick={() => { playSound("click", save); onBack(); }}>Назад</button>
    </>
  );
}

function Settings({ save, setSave, onBack }: { save: SaveData; setSave: (save: SaveData) => void; onBack: () => void }) {
  return (
    <>
      <h2>Настройки</h2>
      <label><span>Общая громкость</span><input type="range" min="0" max="1" step="0.05" value={save.volume} onChange={(e) => setSave({ ...save, volume: Number(e.target.value) })} /></label>
      <label><span>Музыка</span><input type="range" min="0" max="1" step="0.05" value={save.music} onChange={(e) => setSave({ ...save, music: Number(e.target.value) })} /></label>
      <label><span>Эффекты</span><input type="range" min="0" max="1" step="0.05" value={save.effects} onChange={(e) => setSave({ ...save, effects: Number(e.target.value) })} /></label>
      <button onClick={() => { playSound("select", save); setSave({ ...save, fullscreen: !save.fullscreen }); }}>{save.fullscreen ? "Оконный режим" : "Полноэкранный режим"}</button>
      <button className="secondary" onClick={() => { playSound("click", save); onBack(); }}>Назад</button>
    </>
  );
}

function About({ onBack }: { onBack: () => void }) {
  return <><h2>Об игре</h2><p>Паркур-платформер: карабкайся по стенам, делай dash и избегай ловушек.</p><button onClick={onBack}>Назад</button></>;
}

function Pause({ onOpen, onRestart }: { onOpen: (screen: Screen) => void; onRestart: () => void }) {
  return <><h2>Пауза</h2><button onClick={onRestart}>Продолжить</button><button onClick={onRestart}>Перезапуск уровня</button><button onClick={() => onOpen("settings")}>Настройки</button><button onClick={() => onOpen("menu")}>Главное меню</button></>;
}

function Win({ result, next, replay }: { result: { time: number }; next: () => void; replay: () => void }) {
  return <><h2>Уровень пройден</h2><p>Время: {result.time} сек</p><button onClick={next}>Следующий уровень</button><button onClick={replay}>Повторить</button></>;
}
