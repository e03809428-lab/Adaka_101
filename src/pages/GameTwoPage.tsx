import { useEffect, useState } from "react";
import { Link } from "wouter";
import fireDemonImage from "../assets/fire-demon-transparent.png";
import iceDemonImage from "../assets/ice-demon-transparent.png";
import letterImage from "../assets/letter-envelope.png";
import menuDarkDemonImage from "../assets/menu-dark-demon-redraw-solid.png";
import { NightForestScene } from "../components/NightForestScene";
import { playSound, setMenuMusicMood, startMenuMusic, stopMenuMusic } from "../game/audio";
import { loadSave, storeSave } from "../game/save";
import type { SaveData } from "../game/types";
import "../game/game.css";

export function GameTwoPage() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [stage, setStage] = useState<"start" | "letter" | "levels" | "night" | "settings">("start");
  const [isClosing, setIsClosing] = useState(false);
  const [beatSync, setBeatSync] = useState(0);

  const startMenuAudio = () => {
    startMenuMusic(save);
  };

  const syncMenuBeat = () => {
    setBeatSync((current) => current + 1);
    startMenuAudio();
  };

  const click = () => {
    playSound("click", save);
  };

  useEffect(() => storeSave(save), [save]);

  useEffect(() => {
    if (stage === "night" || stage === "settings") {
      stopMenuMusic();
      return;
    }

    if (stage === "start") setMenuMusicMood("normal");
    if (stage === "letter" || stage === "levels") setMenuMusicMood("calm");
    startMenuAudio();

    const onFirstInteraction = () => {
      syncMenuBeat();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };

    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    return () => {
      stopMenuMusic();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [save, stage]);

  const handleOpenLetter = () => {
    click();
    setMenuMusicMood("calm");
    setIsClosing(false);
    setStage("letter");
  };

  const handleCloseLetter = () => {
    click();
    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      setStage("levels");
    }, 500);
  };

  const handleBackToMenu = () => {
    click();
    setMenuMusicMood("normal");
    setStage("start");
  };

  if (stage === "letter") {
    return (
      <main className="letter-black-screen">
        <div className={`letter-scene${isClosing ? " letter-scene--closing" : ""}`}>
          <img className="letter-image" src={letterImage} alt="Письмо" />
          <div className="letter-text">
            <p>Здравствуйте!</p>
            <p>Если вы читаете это письмо, значит, вас приняли на новую работу.</p>
            <p>Ваша работа заключается в том, чтобы побеждать и изгонять демонов в лесу на протяжении 5 ночей.</p>
            <p>Желаю вам удачи в этой непростой работе. За каждую ночь мы будем давать вам по 100 долларов.</p>
          </div>
          <button type="button" className="pencil-arrow" aria-label="Закрыть письмо" onClick={handleCloseLetter} />
        </div>
      </main>
    );
  }

  if (stage === "levels") {
    return (
      <main className="shell shell--red">
        <section className="panel level-panel">
          <h1>Выбери ночь</h1>
          <p>Каждая ночь — новый этап с новыми испытаниями.</p>
          <div className="level-buttons">
            <button type="button" onClick={() => { click(); setStage("night"); }}>1 ночь</button>
            <button type="button" onClick={() => { click(); setStage("night"); }}>2 ночь</button>
            <button type="button" onClick={() => { click(); setStage("night"); }}>3 ночь</button>
            <button type="button" onClick={() => { click(); setStage("night"); }}>4 ночь</button>
            <button type="button" onClick={() => { click(); setStage("night"); }}>5 ночь</button>
          </div>
          <button type="button" className="secondary" onClick={handleBackToMenu}>
            Назад
          </button>
        </section>
      </main>
    );
  }

  if (stage === "night") {
    return <NightForestScene onBack={handleBackToMenu} save={save} />;
  }

  if (stage === "settings") {
    return (
      <main className="shell shell--red">
        <section className="panel">
          <h2>Настройки</h2>
          <label><span>Общая громкость</span><input type="range" min="0" max="1" step="0.05" value={save.volume} onChange={(e) => setSave({ ...save, volume: Number(e.target.value) })} /></label>
          <label><span>Музыка</span><input type="range" min="0" max="1" step="0.05" value={save.music} onChange={(e) => setSave({ ...save, music: Number(e.target.value) })} /></label>
          <label><span>Эффекты</span><input type="range" min="0" max="1" step="0.05" value={save.effects} onChange={(e) => setSave({ ...save, effects: Number(e.target.value) })} /></label>
          <button type="button" onClick={() => { click(); setSave({ ...save, fullscreen: !save.fullscreen }); }}>{save.fullscreen ? "Оконный режим" : "Полноэкранный режим"}</button>
          <button type="button" className="secondary" onClick={handleBackToMenu}>Назад</button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--red" onPointerDown={syncMenuBeat} onKeyDown={syncMenuBeat}>
      <img key={`ice-${beatSync}`} className="menu-demon menu-demon--ice" src={iceDemonImage} alt="" aria-hidden="true" />
      <img key={`fire-${beatSync}`} className="menu-demon menu-demon--fire" src={fireDemonImage} alt="" aria-hidden="true" />
      <img className="menu-top-demon" src={menuDarkDemonImage} alt="" aria-hidden="true" />
      <section className="panel panel--game-two panel--held-menu">
        <Link className="menu-alt-game" href="/game">Первая игра</Link>
        <h1>Игра Егора 2</h1>
        <p>Минималистичный паркур-платформер в красной цветовой гамме.</p>
        <button type="button" onPointerDown={syncMenuBeat} onClick={handleOpenLetter}>Играть</button>
        <button type="button" onClick={() => { click(); setStage("settings"); }}>Настройки</button>
        <button type="button" onClick={() => { click(); startMenuAudio(); }}>Об игре</button>
      </section>
    </main>
  );
}
