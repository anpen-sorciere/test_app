/**
 * ゲームデータの型定義
 */
export interface GameData {
  money: number;
  floors: number;
  incomePerSecond: number;
  lastUpdateTime: number;
}

/**
 * オフライン経過時間に基づいた収入を計算する関数
 * @param oldTime 前回の更新時間（ミリ秒）
 * @param currentTime 現在の時間（ミリ秒）
 * @param incomePerSecond 1秒あたりの収入
 * @returns 計算された収入額
 */
export function calculateOfflineIncome(
  oldTime: number,
  currentTime: number,
  incomePerSecond: number
): number {
  const timeElapsed = (currentTime - oldTime) / 1000; // ミリ秒を秒に変換
  return timeElapsed * incomePerSecond;
}

/**
 * ゲームデータを更新する関数
 * @param data 現在のゲームデータ
 * @param timeElapsed 経過時間（秒）
 * @returns 更新されたゲームデータ
 */
export function updateGame(data: GameData, timeElapsed: number): GameData {
  const income = timeElapsed * data.incomePerSecond;
  
  return {
    ...data,
    money: data.money + income,
    lastUpdateTime: Date.now()
  };
}

/**
 * フロア購入ロジック
 * @param data 現在のゲームデータ
 * @returns 更新されたゲームデータまたはエラー情報
 */
export function buyFloor(data: GameData): GameData | { error: string } {
  const floorCost = 5000;
  const incomeIncrease = 10;
  
  if (data.money < floorCost) {
    return {
      error: "資金が不足しています。フロアを購入するには$5000必要です。"
    };
  }
  
  return {
    ...data,
    money: data.money - floorCost,
    floors: data.floors + 1,
    incomePerSecond: data.incomePerSecond + incomeIncrease
  };
}