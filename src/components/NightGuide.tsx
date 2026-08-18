type NightGuideProps = {
  onBack: () => void;
};

const guideItems = [
  { key: "W/A/S/D", text: "смотреть вверх, вниз и поворачиваться по сторонам" },
  { key: "J", text: "огненное заклинание против ледяного демона" },
  { key: "K", text: "ледяное заклинание против красного демона" },
  { key: "E", text: "накопление стихийной маны" },
  { key: "Q", text: "накопление внешней маны" },
  { key: "M", text: "карта леса и позиции демонов" },
];

export function NightGuide({ onBack }: NightGuideProps) {
  return (
    <section className="panel night-guide-panel panel--game-two-menu">
      <h1>Гайд</h1>
      <p>Твоя задача - пережить ночь и не дать демонам добраться до ядра леса.</p>
      <div className="night-guide-list">
        {guideItems.map((item) => (
          <div className="night-guide-item" key={item.key}>
            <strong>{item.key}</strong>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      <div className="night-guide-mana">
        <h2>Накопление маны</h2>
        <p>Нажми `E`, чтобы открыть стихийную ману, или `Q`, чтобы открыть внешнюю ману.</p>
        <p>В центре круга появляется буква: `W`, `A`, `S` или `D`. Нажимай такую же кнопку, когда синяя стрелка попадает в подсвеченный сектор круга.</p>
        <p>Если попал вовремя, мана прибавится. Если нажал не ту букву или не попал в сектор, появится новая буква и новая цель.</p>
        <p>Выйти из меню можно кнопкой `X` или повторным нажатием `E`/`Q`.</p>
      </div>
      <p>Красный демон атакует с запада и востока. Ледяной демон атакует с севера и юга. Следи за картой и копи ману заранее.</p>
      <button type="button" className="secondary" onClick={onBack}>Назад</button>
    </section>
  );
}
