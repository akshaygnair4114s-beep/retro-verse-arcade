export type GameCategory = "Arcade" | "Puzzle" | "Strategy" | "Action" | "Sports" | "Multiplayer";

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  category: GameCategory;
  difficulty: "Easy" | "Medium" | "Hard";
  players: string;
  multiplayer: boolean;
  accent: "cyan" | "magenta" | "yellow" | "green" | "purple";
  available: boolean;
  emoji: string;
}

export const GAMES: GameMeta[] = [
  { id: "tetris", name: "Tetris", tagline: "Stack. Clear. Survive.", category: "Puzzle", difficulty: "Medium", players: "1P", multiplayer: false, accent: "cyan", available: true, emoji: "🧱" },
  { id: "snake", name: "Snake", tagline: "Eat. Grow. Don't crash.", category: "Arcade", difficulty: "Easy", players: "1P", multiplayer: false, accent: "green", available: true, emoji: "🐍" },
  { id: "pong", name: "Pong", tagline: "The original duel.", category: "Sports", difficulty: "Easy", players: "1P", multiplayer: false, accent: "magenta", available: true, emoji: "🏓" },
  { id: "2048", name: "2048", tagline: "Slide. Merge. Win.", category: "Puzzle", difficulty: "Medium", players: "1P", multiplayer: false, accent: "yellow", available: true, emoji: "🔢" },
  { id: "tictactoe", name: "Tic-Tac-Toe", tagline: "Three in a row.", category: "Strategy", difficulty: "Easy", players: "1P", multiplayer: false, accent: "purple", available: true, emoji: "❌" },
  { id: "breakout", name: "Breakout", tagline: "Smash every brick.", category: "Arcade", difficulty: "Medium", players: "1P", multiplayer: false, accent: "cyan", available: false, emoji: "🧱" },
  { id: "space-invaders", name: "Space Invaders", tagline: "Defend the planet.", category: "Action", difficulty: "Hard", players: "1P", multiplayer: false, accent: "green", available: false, emoji: "👾" },
  { id: "pacman", name: "Maze Muncher", tagline: "Pellet hunter.", category: "Arcade", difficulty: "Medium", players: "1P", multiplayer: false, accent: "yellow", available: false, emoji: "🟡" },
  { id: "asteroids", name: "Asteroids", tagline: "Drift and blast.", category: "Action", difficulty: "Hard", players: "1P", multiplayer: false, accent: "magenta", available: false, emoji: "☄️" },
  { id: "minesweeper", name: "Minesweeper", tagline: "One wrong click…", category: "Puzzle", difficulty: "Hard", players: "1P", multiplayer: false, accent: "purple", available: false, emoji: "💣" },
  { id: "memory", name: "Memory Match", tagline: "Pair them up.", category: "Puzzle", difficulty: "Easy", players: "1P", multiplayer: false, accent: "cyan", available: false, emoji: "🃏" },
  { id: "chess", name: "Chess", tagline: "The royal game.", category: "Strategy", difficulty: "Hard", players: "2P", multiplayer: true, accent: "purple", available: false, emoji: "♟️" },
];

export const CATEGORIES: GameCategory[] = ["Arcade", "Puzzle", "Strategy", "Action", "Sports", "Multiplayer"];

export function getGame(id: string) {
  return GAMES.find((g) => g.id === id);
}
