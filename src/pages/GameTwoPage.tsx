import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import fireDemonImage from "../assets/fire-demon-transparent.png";
import iceDemonImage from "../assets/ice-demon-transparent.png";
import menuDarkDemonImage from "../assets/menu-dark-demon-redraw-solid.png";
import pixelSpruceImage from "../assets/pixel-spruce-green.png";
import { NightForestScene } from "../components/NightForestScene";
import { NightGuide } from "../components/NightGuide";
import { playSound, setMenuMusicMood, startMenuMusic, stopMenuMusic } from "../game/audio";
import { t } from "../game/language";
import { loadSave, storeSave } from "../game/save";
import type { SaveData } from "../game/types";
import "../game/game.css";

type Stage = "start" | "levels" | "night" | "settings" | "guide";

export function GameTwoPage() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [stage, setStage] = useState<Stage>("start");
  const [selectedNight, setSelectedNight] = useState(1);
  const [shouldStartWon, setShouldStartWon] = useState(false);
  const [beatSync, setBeatSync] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const transitionTimeout = useRef(0);
  const text = (key: Parameters<typeof t>[1]) => t(save.language, key);
  const screenClass = `screen-fade${isFadingOut ? " screen-fade--out" : ""}`;

  const transitionTo = (nextStage: Stage, beforeChange?: () => void) => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    window.clearTimeout(transitionTimeout.current);
    transitionTimeout.current = window.setTimeout(() => {
      beforeChange?.();
      setStage(nextStage);
      setIsFadingOut(false);
    }, 260);
  };

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

  const isNightUnlocked = (night: number) => night === 1 || save.completedNights.includes(night - 1);

  const renderMenuForest = () => (
    <div className="menu-forest-bg" aria-hidden="true">
      <img className="menu-forest-tree menu-forest-tree--left-far" src={pixelSpruceImage} alt="" draggable={false} />
      <img className="menu-forest-tree menu-forest-tree--left" src={pixelSpruceImage} alt="" draggable={false} />
      <img className="menu-forest-tree menu-forest-tree--center" src={pixelSpruceImage} alt="" draggable={false} />
      <img className="menu-forest-tree menu-forest-tree--right" src={pixelSpruceImage} alt="" draggable={false} />
      <img className="menu-forest-tree menu-forest-tree--right-far" src={pixelSpruceImage} alt="" draggable={false} />
      <span className="menu-forest-grass menu-forest-grass--one" />
      <span className="menu-forest-grass menu-forest-grass--two" />
      <span className="menu-forest-grass menu-forest-grass--three" />
    </div>
  );

  useEffect(() => storeSave(save), [save]);

  useEffect(() => {
    return () => window.clearTimeout(transitionTimeout.current);
  }, []);

  useEffect(() => {
    if (stage !== "start" && stage !== "settings" && stage !== "guide") return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Escape" && stage === "start") {
        click();
        transitionTo("settings");
      }

      if (event.code === "Escape" && stage === "settings") {
        handleBackToMenu();
      }

      if (event.code === "Escape" && stage === "guide") {
        handleBackToMenu();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [save, stage]);

  useEffect(() => {
    if (stage === "night" || stage === "settings") {
      stopMenuMusic();
      return;
    }

    if (stage === "start") setMenuMusicMood("normal");
    if (stage === "levels") setMenuMusicMood("calm");
    if (stage === "guide") setMenuMusicMood("calm");
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

  const handleOpenLevels = () => {
    click();
    setMenuMusicMood("calm");
    transitionTo("levels");
  };

  const handleBackToMenu = () => {
    click();
    setMenuMusicMood("normal");
    transitionTo("start");
  };

  if (stage === "levels") {
    return (
      <main className={`shell shell--red shell--forest-menu ${screenClass}`}>
        {renderMenuForest()}
        <div className="menu-edge-darkness" aria-hidden="true" />
        <section className="panel level-panel">
          <h1>{save.language === "ru" ? "Выбери ночь" : "Choose a night"}</h1>
          <p>{text("levelsIntro")}</p>
          <div className="level-buttons">
            {[1, 2, 3, 4, 5].map((night) => (
              <button
                type="button"
                key={night}
                disabled={!isNightUnlocked(night)}
                onClick={() => { click(); transitionTo("night", () => { setSelectedNight(night); setShouldStartWon(false); }); }}
              >
                {night} {text("night")}
                {!isNightUnlocked(night) && " закрыта"}
              </button>
            ))}
          </div>
          <button type="button" className="secondary" onClick={handleBackToMenu}>
            {text("back")}
          </button>
        </section>
      </main>
    );
  }

  if (stage === "night") {
    return <NightForestScene onBack={handleBackToMenu} save={save} setSave={setSave} night={selectedNight} initialWon={shouldStartWon} />;
  }

  if (stage === "settings") {
    return (
      <main className={`shell shell--red shell--forest-menu ${screenClass}`}>
        {renderMenuForest()}
        <div className="menu-edge-darkness" aria-hidden="true" />
        <section className="panel panel--game-two-menu">
          <h2>{text("settings")}</h2>
          <label><span>{text("language")}</span><button type="button" onClick={() => { click(); setSave({ ...save, language: save.language === "ru" ? "en" : "ru" }); }}>{save.language === "ru" ? text("switchToEnglish") : text("switchToRussian")}</button></label>
          <label><span>{save.language === "ru" ? "Общая громкость" : "Master volume"}</span><input type="range" min="0" max="1" step="0.05" value={save.volume} onChange={(e) => setSave({ ...save, volume: Number(e.target.value) })} /></label>
          <label><span>{text("music")}</span><input type="range" min="0" max="1" step="0.05" value={save.music} onChange={(e) => setSave({ ...save, music: Number(e.target.value) })} /></label>
          <label><span>{text("effects")}</span><input type="range" min="0" max="1" step="0.05" value={save.effects} onChange={(e) => setSave({ ...save, effects: Number(e.target.value) })} /></label>
          <button type="button" onClick={() => { click(); setSave({ ...save, fullscreen: !save.fullscreen }); }}>{save.fullscreen ? text("windowed") : text("fullscreen")}</button>
          <button type="button" onClick={() => { click(); transitionTo("night", () => { setShouldStartWon(true); }); }}>
            Победа
          </button>
          <button type="button" className="secondary" onClick={handleBackToMenu}>{text("back")}</button>
        </section>
      </main>
    );
  }

  if (stage === "guide") {
    return (
      <main className={`shell shell--red shell--forest-menu ${screenClass}`}>
        {renderMenuForest()}
        <div className="menu-edge-darkness" aria-hidden="true" />
        <NightGuide onBack={handleBackToMenu} />
      </main>
    );
  }

  return (
    <main className={`shell shell--red shell--forest-menu ${screenClass}`} onPointerDown={syncMenuBeat} onKeyDown={syncMenuBeat}>
      {renderMenuForest()}
      <img key={`ice-${beatSync}`} className="menu-demon menu-demon--ice" src={iceDemonImage} alt="" aria-hidden="true" />
      <img key={`fire-${beatSync}`} className="menu-demon menu-demon--fire" src={fireDemonImage} alt="" aria-hidden="true" />
      <img className="menu-top-demon" src={menuDarkDemonImage} alt="" aria-hidden="true" />
      <div className="menu-edge-darkness" aria-hidden="true" />
      <section className="panel panel--game-two panel--held-menu panel--game-two-menu">
        <Link className="menu-alt-game" href="/game">{save.language === "ru" ? "Первая игра" : "First game"}</Link>
        <h1>{text("gameTitle")}</h1>
        <button type="button" onPointerDown={syncMenuBeat} onClick={handleOpenLevels}>{text("play")}</button>
        <button type="button" onClick={() => { click(); setMenuMusicMood("calm"); transitionTo("guide"); }}>Гайд</button>
        <button type="button" onClick={() => { click(); transitionTo("settings"); }}>{text("settings")}</button>
        <button type="button" onClick={() => { click(); startMenuAudio(); }}>{text("about")}</button>
      </section>
    </main>
  );
}
