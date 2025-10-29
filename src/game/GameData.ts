/**
 * ゲームデータの型定義とデータ構造
 */

// ゲームの状態を表す列挙型
export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

// プレイヤーの情報
export interface Player {
  id: string;
  name: string;
  score: number;
  level: number;
  lives: number;
  position: { x: number; y: number };
}

// ゲーム設定
export interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  maxLives: number;
  targetScore: number;
  timeLimit?: number; // 秒単位、undefinedの場合は制限なし
}

// ゲームの状態データ
export interface GameData {
  state: GameState;
  player: Player;
  config: GameConfig;
  startTime: number;
  currentTime: number;
  isPaused: boolean;
  money: number; // 資金
  floors: number; // フロア数
}

// デフォルトのゲーム設定
export const DEFAULT_GAME_CONFIG: GameConfig = {
  difficulty: 'medium',
  maxLives: 3,
  targetScore: 1000,
  timeLimit: undefined
};

// デフォルトのプレイヤーデータ
export const DEFAULT_PLAYER: Player = {
  id: 'player1',
  name: 'Player',
  score: 0,
  level: 1,
  lives: 3,
  position: { x: 0, y: 0 }
};

// 初期ゲームデータ
export const INITIAL_GAME_DATA: GameData = {
  state: GameState.MENU,
  player: { ...DEFAULT_PLAYER },
  config: { ...DEFAULT_GAME_CONFIG },
  startTime: 0,
  currentTime: 0,
  isPaused: false,
  money: 0,
  floors: 1
};