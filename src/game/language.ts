import type { SaveData } from "./types";

type TextKey =
  | "about"
  | "back"
  | "east"
  | "effects"
  | "fullscreen"
  | "gameTitle"
  | "language"
  | "lostHint"
  | "levelsIntro"
  | "mainMenu"
  | "music"
  | "night"
  | "north"
  | "pause"
  | "play"
  | "resume"
  | "south"
  | "settings"
  | "switchToEnglish"
  | "switchToRussian"
  | "up"
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
    language: "Язык",
    lostHint: "Нажми любую клавишу",
    levelsIntro: "Каждая ночь - новый этап с новыми испытаниями.",
    mainMenu: "В главное меню",
    music: "Музыка",
    night: "ночь",
    north: "Север",
    pause: "Пауза",
    play: "Играть",
    resume: "Продолжить",
    south: "Юг",
    settings: "Настройки",
    switchToEnglish: "English",
    switchToRussian: "Русский",
    up: "Вверх",
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
    language: "Language",
    lostHint: "Press any key",
    levelsIntro: "Each night is a new stage with new trials.",
    mainMenu: "Main menu",
    music: "Music",
    night: "night",
    north: "North",
    pause: "Paused",
    play: "Play",
    resume: "Resume",
    south: "South",
    settings: "Settings",
    switchToEnglish: "English",
    switchToRussian: "Russian",
    up: "Up",
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
