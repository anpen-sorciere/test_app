import { GameData, GameState, Player, GameConfig, INITIAL_GAME_DATA } from './GameData';

/**
 * ゲームロジックの実装
 */
export class GameLogic {
  private gameData: GameData;

  constructor(initialData?: Partial<GameData>) {
    this.gameData = {
      ...INITIAL_GAME_DATA,
      ...initialData
    };
  }

  /**
   * ゲームを開始する
   */
  public startGame(): void {
    this.gameData.state = GameState.PLAYING;
    this.gameData.startTime = Date.now();
    this.gameData.currentTime = 0;
    this.gameData.isPaused = false;
  }

  /**
   * ゲームを一時停止する
   */
  public pauseGame(): void {
    if (this.gameData.state === GameState.PLAYING) {
      this.gameData.state = GameState.PAUSED;
      this.gameData.isPaused = true;
    }
  }

  /**
   * ゲームを再開する
   */
  public resumeGame(): void {
    if (this.gameData.state === GameState.PAUSED) {
      this.gameData.state = GameState.PLAYING;
      this.gameData.isPaused = false;
    }
  }

  /**
   * ゲームを終了する
   */
  public endGame(): void {
    this.gameData.state = GameState.GAME_OVER;
    this.gameData.isPaused = false;
  }

  /**
   * プレイヤーのスコアを更新する
   */
  public updateScore(points: number): void {
    this.gameData.player.score += points;
    
    // レベルアップの判定
    const newLevel = Math.floor(this.gameData.player.score / 100) + 1;
    if (newLevel > this.gameData.player.level) {
      this.gameData.player.level = newLevel;
    }
  }

  /**
   * プレイヤーのライフを減らす
   */
  public loseLife(): boolean {
    this.gameData.player.lives -= 1;
    
    if (this.gameData.player.lives <= 0) {
      this.endGame();
      return true; // ゲームオーバー
    }
    
    return false; // まだゲーム続行
  }

  /**
   * プレイヤーの位置を更新する
   */
  public updatePlayerPosition(x: number, y: number): void {
    this.gameData.player.position = { x, y };
  }

  /**
   * ゲームの時間を更新する
   */
  public updateGameTime(): void {
    if (this.gameData.state === GameState.PLAYING && !this.gameData.isPaused) {
      this.gameData.currentTime = Date.now() - this.gameData.startTime;
    }
  }

  /**
   * 勝利条件をチェックする
   */
  public checkVictoryCondition(): boolean {
    if (this.gameData.player.score >= this.gameData.config.targetScore) {
      this.gameData.state = GameState.VICTORY;
      return true;
    }
    return false;
  }

  /**
   * 時間制限をチェックする
   */
  public checkTimeLimit(): boolean {
    if (this.gameData.config.timeLimit) {
      const elapsedSeconds = this.gameData.currentTime / 1000;
      if (elapsedSeconds >= this.gameData.config.timeLimit) {
        this.endGame();
        return true;
      }
    }
    return false;
  }

  /**
   * ゲームデータを取得する
   */
  public getGameData(): GameData {
    return { ...this.gameData };
  }

  /**
   * プレイヤー情報を取得する
   */
  public getPlayer(): Player {
    return { ...this.gameData.player };
  }

  /**
   * ゲーム状態を取得する
   */
  public getGameState(): GameState {
    return this.gameData.state;
  }

  /**
   * ゲーム設定を更新する
   */
  public updateGameConfig(config: Partial<GameConfig>): void {
    this.gameData.config = { ...this.gameData.config, ...config };
  }

  /**
   * ゲームをリセットする
   */
  public resetGame(): void {
    this.gameData = { ...INITIAL_GAME_DATA };
  }

  /**
   * ゲームループの更新処理
   */
  public update(): void {
    if (this.gameData.state === GameState.PLAYING && !this.gameData.isPaused) {
      this.updateGameTime();
      this.checkTimeLimit();
      this.checkVictoryCondition();
    }
  }
}