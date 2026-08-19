import { t } from "../game/language";
import type { SaveData } from "../game/types";

type NightGuideProps = {
  onBack: () => void;
  language: SaveData["language"];
};

const guideItems = [
  { key: "W/A/S/D", textKey: "guideMove" },
  { key: "J", textKey: "guideFire" },
  { key: "K", textKey: "guideIce" },
  { key: "E", textKey: "guideElementalMana" },
  { key: "Q", textKey: "guideExternalMana" },
  { key: "M", textKey: "guideMap" },
] as const;

export function NightGuide({ onBack, language }: NightGuideProps) {
  return (
    <section className="panel night-guide-panel panel--game-two-menu">
      <h1>{t(language, "guide")}</h1>
      <p>{t(language, "guideIntro")}</p>
      <div className="night-guide-list">
        {guideItems.map((item) => (
          <div className="night-guide-item" key={item.key}>
            <strong>{item.key}</strong>
            <span>{t(language, item.textKey)}</span>
          </div>
        ))}
      </div>
      <div className="night-guide-mana">
        <h2>{t(language, "guideManaTitle")}</h2>
        <p>{t(language, "guideManaBodyOne")}</p>
        <p>{t(language, "guideManaBodyTwo")}</p>
        <p>{t(language, "guideManaBodyThree")}</p>
        <p>{t(language, "guideManaBodyFour")}</p>
      </div>
      <p>{t(language, "guideWarning")}</p>
      <button type="button" className="secondary" onClick={onBack}>{t(language, "back")}</button>
    </section>
  );
}
