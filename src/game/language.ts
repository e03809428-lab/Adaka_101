import type { SaveData } from "./types";

type TextKey =
  | "about"
  | "back"
  | "east"
  | "effects"
  | "fullscreen"
  | "gameTitle"
  | "guide"
  | "guideIntro"
  | "guideManaBodyOne"
  | "guideManaBodyTwo"
  | "guideManaBodyThree"
  | "guideManaBodyFour"
  | "guideManaTitle"
  | "guideWarning"
  | "guideMove"
  | "guideFire"
  | "guideIce"
  | "guideElementalMana"
  | "guideExternalMana"
  | "guideMap"
  | "actions"
  | "chooseNight"
  | "closeMana"
  | "closeMap"
  | "closeMenu"
  | "continue"
  | "down"
  | "elementalMana"
  | "externalMana"
  | "fire"
  | "fireSpell"
  | "fireSpellCost"
  | "forestWalk"
  | "firstGame"
  | "ice"
  | "iceSpell"
  | "iceSpellCost"
  | "light"
  | "lightSpell"
  | "lightSpellCost"
  | "introLetterBody"
  | "introLetterSignoff"
  | "language"
  | "lostHint"
  | "levelsIntro"
  | "mainMenu"
  | "masterVolume"
  | "manaRitual"
  | "map"
  | "mapHint"
  | "mobileControls"
  | "music"
  | "night"
  | "north"
  | "pause"
  | "play"
  | "resume"
  | "right"
  | "south"
  | "settings"
  | "switchToEnglish"
  | "switchToRussian"
  | "up"
  | "victory"
  | "west"
  | "winHint"
  | "youWon"
  | "youLost"
  | "windowed";

const text: Record<SaveData["language"], Record<TextKey, string>> = {
  ru: {
    about: "Об игре",
    back: "Назад",
    east: "Восток",
    effects: "Эффекты",
    fullscreen: "Полноэкранный режим",
    gameTitle: "Игра Егора 2",
    guide: "Гайд",
    guideIntro: "Твоя задача - пережить ночь и не дать демонам добраться до ядра леса.",
    guideManaBodyOne: "Нажми `E`, чтобы открыть стихийную ману, или `Q`, чтобы открыть внешнюю ману.",
    guideManaBodyTwo: "В центре круга появляется буква: `W`, `A`, `S` или `D`. Нажимай такую же кнопку, когда синяя стрелка попадает в подсвеченный сектор круга.",
    guideManaBodyThree: "Если попал вовремя, мана прибавится. Если нажал не ту букву или не попал в сектор, появится новая буква и новая цель.",
    guideManaBodyFour: "Выйти из меню можно кнопкой `X` или повторным нажатием `E`/`Q`.",
    guideManaTitle: "Накопление маны",
    guideWarning: "Красный демон атакует с запада и востока. Ледяной демон атакует с севера и юга. Следи за картой и копи ману заранее.",
    guideMove: "смотреть вверх, вниз и поворачиваться по сторонам",
    guideFire: "огненное заклинание против ледяного демона",
    guideIce: "ледяное заклинание против красного демона",
    guideElementalMana: "накопление стихийной маны",
    guideExternalMana: "накопление внешней маны",
    guideMap: "карта леса и позиции демонов",
    actions: "Действия",
    chooseNight: "Выбери ночь",
    closeMana: "Выйти из накопления маны",
    closeMap: "Закрыть карту",
    closeMenu: "Закрыть меню",
    continue: "Продолжить",
    down: "Вниз",
    elementalMana: "Стихийная мана",
    externalMana: "Внешняя мана",
    fire: "Огонь",
    fireSpell: "Огненное заклинание",
    fireSpellCost: "Тратит 8 очков стихийной маны",
    forestWalk: "Лесная мини-игра",
    firstGame: "Первая игра",
    ice: "Лед",
    iceSpell: "Ледяное заклинание",
    iceSpellCost: "Тратит 6 очков стихийной маны",
    light: "Свет",
    lightSpell: "Заклинание света",
    lightSpellCost: "7 стихийной и 4.5 внешней маны",
    introLetterBody: "Здравствуйте! Если вы читаете это письмо, значит, вы согласны с условиями нашей работы. В лесу есть демоны, и вы должны не дать им добраться до энергетического ядра леса: их привлекает его излучение. Адрес, где вы можете забрать деньги: улица Пушкина, дом 5, квартира 15.",
    introLetterSignoff: "Надеюсь, вы сможете защитить ядро.",
    language: "Язык",
    lostHint: "Нажми любую клавишу",
    levelsIntro: "Каждая ночь - новый этап с новыми испытаниями.",
    mainMenu: "В главное меню",
    masterVolume: "Общая громкость",
    manaRitual: "Управление ритуалом",
    map: "Карта",
    mapHint: "Открывает карту леса",
    mobileControls: "Мобильное управление",
    music: "Музыка",
    night: "ночь",
    north: "Север",
    pause: "Пауза",
    play: "Играть",
    resume: "Продолжить",
    right: "Вправо",
    south: "Юг",
    settings: "Настройки",
    switchToEnglish: "English",
    switchToRussian: "Русский",
    up: "Вверх",
    victory: "Победа",
    west: "Запад",
    winHint: "Нажми любую клавишу",
    youWon: "Ты выиграл",
    youLost: "Ты проиграл",
    windowed: "Оконный режим",
  },
  en: {
    about: "About",
    back: "Back",
    east: "East",
    effects: "Effects",
    fullscreen: "Fullscreen",
    gameTitle: "Egor's Game 2",
    guide: "Guide",
    guideIntro: "Your goal is to survive the night and stop the demons from reaching the forest core.",
    guideManaBodyOne: "Press `E` to open elemental mana, or `Q` to open external mana.",
    guideManaBodyTwo: "A letter appears in the center of the circle: `W`, `A`, `S`, or `D`. Press the same key when the blue arrow enters the highlighted sector.",
    guideManaBodyThree: "If your timing is right, mana increases. If you press the wrong letter or miss the sector, a new letter and target appear.",
    guideManaBodyFour: "You can exit the menu with `X` or by pressing `E`/`Q` again.",
    guideManaTitle: "Mana Charging",
    guideWarning: "The red demon attacks from west and east. The ice demon attacks from north and south. Watch the map and gather mana early.",
    guideMove: "look up, look down, and turn around",
    guideFire: "fire spell against the ice demon",
    guideIce: "ice spell against the red demon",
    guideElementalMana: "charge elemental mana",
    guideExternalMana: "charge external mana",
    guideMap: "forest map and demon positions",
    actions: "Actions",
    chooseNight: "Choose a night",
    closeMana: "Exit mana charging",
    closeMap: "Close map",
    closeMenu: "Close menu",
    continue: "Continue",
    down: "Down",
    elementalMana: "Elemental mana",
    externalMana: "External mana",
    fire: "Fire",
    fireSpell: "Fire spell",
    fireSpellCost: "Costs 8 elemental mana",
    forestWalk: "Forest mini-game",
    firstGame: "First game",
    ice: "Ice",
    iceSpell: "Ice spell",
    iceSpellCost: "Costs 6 elemental mana",
    light: "Light",
    lightSpell: "Light spell",
    lightSpellCost: "7 elemental and 4.5 external mana",
    introLetterBody: "Hello! If you are reading this letter, it means you agree to our working terms. There are demons in the forest, and you must stop them from reaching the forest energy core: they are drawn to its radiation. The address where you can collect the money: Pushkin Street, building 5, apartment 15.",
    introLetterSignoff: "I hope you can protect the core.",
    language: "Language",
    lostHint: "Press any key",
    levelsIntro: "Each night is a new stage with new trials.",
    mainMenu: "Main menu",
    masterVolume: "Master volume",
    manaRitual: "Ritual controls",
    map: "Map",
    mapHint: "Opens the forest map",
    mobileControls: "Mobile controls",
    music: "Music",
    night: "night",
    north: "North",
    pause: "Paused",
    play: "Play",
    resume: "Resume",
    right: "Right",
    south: "South",
    settings: "Settings",
    switchToEnglish: "English",
    switchToRussian: "Russian",
    up: "Up",
    victory: "Victory",
    west: "West",
    winHint: "Press any key",
    youWon: "You won",
    youLost: "You lost",
    windowed: "Windowed mode",
  },
};

export function t(language: SaveData["language"], key: TextKey) {
  return text[language][key];
}
