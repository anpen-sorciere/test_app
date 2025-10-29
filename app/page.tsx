'use client';

import { useState, useEffect, useRef } from 'react';
import { GameLogic } from '@/src/game/GameLogic';
import { GameData, INITIAL_GAME_DATA, GameState } from '@/src/game/GameData';

const STORAGE_KEY = 'game_save_data';
const FLOOR_COST = 5000;

export default function Home() {
  const [gameData, setGameData] = useState<GameData>(INITIAL_GAME_DATA);
  const gameLogicRef = useRef<GameLogic | null>(null);

  // ゲームロジックの初期化とローカルストレージからの読み込み
  useEffect(() => {
    // ローカルストレージからゲームデータを読み込む
    const savedData = localStorage.getItem(STORAGE_KEY);
    let initialData: GameData;

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        initialData = {
          ...INITIAL_GAME_DATA,
          ...parsed,
          startTime: parsed.startTime || Date.now(),
        };
      } catch (error) {
        console.error('Failed to parse saved game data:', error);
        initialData = INITIAL_GAME_DATA;
      }
    } else {
      initialData = INITIAL_GAME_DATA;
      // ゲームを自動的に開始
      initialData.state = GameState.PLAYING;
      initialData.startTime = Date.now();
    }

    // GameLogicのインスタンスを作成
    gameLogicRef.current = new GameLogic(initialData);
    setGameData(initialData);
  }, []);

  // 1秒ごとにゲームロジックを更新
  useEffect(() => {
    if (!gameLogicRef.current) return;

    const interval = setInterval(() => {
      if (gameLogicRef.current) {
        // ゲームロジックを更新
        gameLogicRef.current.update();
        
        // 更新後のゲームデータを取得して状態を更新
        const updatedData = gameLogicRef.current.getGameData();
        setGameData(updatedData);

        // ローカルストレージに保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      }
    }, 1000); // 1秒ごと

    return () => clearInterval(interval);
  }, []);

  // ゲームデータが変更されたらローカルストレージに保存
  useEffect(() => {
    if (gameLogicRef.current && gameData.state !== GameState.MENU) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
    }
  }, [gameData]);

  // フロア購入ボタンのハンドラー
  const handleBuyFloor = () => {
    if (!gameLogicRef.current) return;

    const success = gameLogicRef.current.buyFloor(FLOOR_COST);
    if (success) {
      // 購入成功後、最新のゲームデータを取得
      const updatedData = gameLogicRef.current.getGameData();
      setGameData(updatedData);
    } else {
      // 資金不足の場合はアラート（オプション）
      alert('資金が不足しています！');
    }
  };

  // 資金を整形して表示
  const formatMoney = (money: number): string => {
    return `$${money.toLocaleString()}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">
            タワー経営ゲーム
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 資金表示 */}
          <div className="rounded-lg border border-gray-300 bg-gradient-to-b from-zinc-200 p-6 dark:border-neutral-700 dark:bg-zinc-800/30">
            <h2 className="mb-3 text-xl font-semibold">
              資金
            </h2>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatMoney(gameData.money)}
            </p>
          </div>

          {/* フロア数表示 */}
          <div className="rounded-lg border border-gray-300 bg-gradient-to-b from-zinc-200 p-6 dark:border-neutral-700 dark:bg-zinc-800/30">
            <h2 className="mb-3 text-xl font-semibold">
              フロア数
            </h2>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {gameData.floors}
            </p>
          </div>

          {/* 収入表示 */}
          <div className="rounded-lg border border-gray-300 bg-gradient-to-b from-zinc-200 p-6 dark:border-neutral-700 dark:bg-zinc-800/30">
            <h2 className="mb-3 text-xl font-semibold">
              収入/秒
            </h2>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              ${gameData.floors * 10}/秒
            </p>
          </div>
        </div>

        {/* フロア購入ボタン */}
        <div className="mt-8 text-center">
          <button
            onClick={handleBuyFloor}
            disabled={gameData.money < FLOOR_COST}
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors ${
              gameData.money >= FLOOR_COST
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            } dark:bg-blue-800 dark:hover:bg-blue-900`}
          >
            新しいフロアを購入（{formatMoney(FLOOR_COST)}）
          </button>
          {gameData.money < FLOOR_COST && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              資金が不足しています（必要: {formatMoney(FLOOR_COST)}）
            </p>
          )}
        </div>

        {/* ゲーム状態表示 */}
        <div className="mt-8 text-center">
          <p className="text-sm opacity-70">
            ゲーム状態: {gameData.state === GameState.PLAYING ? 'プレイ中' : gameData.state}
          </p>
        </div>
      </div>
    </main>
  );
}