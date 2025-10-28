/**
 * ゲームデータの型定義
 */
export interface GameData {
  money: number;
  floors: number;
  incomePerSecond: number;
}

/**
 * ゲームデータの初期値
 */
export const initialGameData: GameData = {
  money: 1000,
  floors: 0,
  incomePerSecond: 10,
};