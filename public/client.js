/**
 * クライアント側のロジック
 * WebSocket接続、サーバーからのデータに基づく画面描画更新、
 * ユーザー入力（クリック、ボタン操作）の検知とサーバーへの送信
 * 360度タワーディフェンス対応
 */

class GameClient {
  constructor() {
    this.ws = null;
    this.gameState = null;
    this.enemyElements = new Map(); // 敵のDOM要素を管理
    this.attackEffectElements = new Map(); // 攻撃エフェクトのDOM要素を管理
    this.cursorAttackMode = false; // Cursor+モードが有効か
    
    // 画面の中心座標（初期化時に計算）
    this.centerX = 0;
    this.centerY = 0;
    this.didInitRetry = false; // 初回INITでのリトライ送信フラグ
    this.didAutoStart = false; // 初回自動開始フラグ
    
    this.init();
  }

  /**
   * 初期化処理
   */
  init() {
    this.updateCenterPosition();
    window.addEventListener('resize', () => {
      this.updateCenterPosition();
      this.render(); // リサイズ時に再描画
    });
    
    this.connectWebSocket();
    this.setupEventListeners();
  }

  /**
   * 画面の中心座標を更新
   */
  updateCenterPosition() {
    const gameField = document.getElementById('game-field');
    const rect = gameField.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    
    // タワーを中心に配置
    const tower = document.getElementById('tower');
    if (tower) {
      tower.style.left = `${rect.width / 2}px`;
      tower.style.top = `${rect.height / 2}px`;
    }

    // 射程範囲の可視化を更新
    this.updateTowerRange();
  }

  /**
   * タワーの射程範囲を可視化
   */
  updateTowerRange() {
    if (!this.gameState) return;
    
    const rangeEl = document.getElementById('tower-range');
    const gameField = document.getElementById('game-field');
    const rect = gameField.getBoundingClientRect();
    
    if (rangeEl && this.gameState.tower) {
      const range = this.gameState.tower.range;
      rangeEl.style.width = `${range * 2}px`;
      rangeEl.style.height = `${range * 2}px`;
      rangeEl.style.left = `${rect.width / 2}px`;
      rangeEl.style.top = `${rect.height / 2}px`;
    }
  }

  /**
   * ゲーム座標（中心が0,0）を画面座標に変換
   * @param {number} gameX ゲーム座標X
   * @param {number} gameY ゲーム座標Y
   * @returns {Object} {x, y} 画面座標
   */
  gameToScreen(gameX, gameY) {
    const gameField = document.getElementById('game-field');
    const rect = gameField.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    return {
      x: centerX + gameX,
      y: centerY + gameY
    };
  }

  /**
   * 画面座標をゲーム座標（中心が0,0）に変換
   * @param {number} screenX 画面座標X
   * @param {number} screenY 画面座標Y
   * @returns {Object} {x, y} ゲーム座標
   */
  screenToGame(screenX, screenY) {
    const gameField = document.getElementById('game-field');
    const rect = gameField.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    return {
      x: screenX - centerX,
      y: screenY - centerY
    };
  }

  /**
   * WebSocket接続を確立
   */
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleServerMessage(message);
      } catch (error) {
        console.error('メッセージのパースエラー:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocketエラー:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket接続が切断されました');
      // 3秒後に再接続を試みる
      setTimeout(() => {
        this.connectWebSocket();
      }, 3000);
    };
  }

  /**
   * サーバーからのメッセージを処理
   * @param {Object} message サーバーからのメッセージ
   */
  handleServerMessage(message) {
    switch (message.type) {
      case 'INIT':
        this.gameState = message.data;
        this.updateTowerRange();
        // ホームから遷移直後にゲームオーバー状態が残っている場合は即リトライして待機状態に戻す
        const gameOverEl = document.getElementById('game-over');
        if (gameOverEl) {
          gameOverEl.classList.remove('show');
          gameOverEl.classList.remove('shown');
        }
        if (this.gameState && this.gameState.gameOver && !this.didInitRetry) {
          this.didInitRetry = true;
          this.sendMessage({ type: 'RETRY' });
        }
        // バトル画面に来たら自動でウェーブ開始
        if (!this.didAutoStart) {
          this.didAutoStart = true;
          setTimeout(() => {
            this.sendMessage({ type: 'START_WAVE' });
            const startArea = document.getElementById('start-area');
            if (startArea) startArea.style.display = 'none';
          }, 150);
        }
        this.render();
        break;
      case 'UPDATE':
        this.gameState = message.data;
        this.render();
        break;
      default:
        console.log('不明なメッセージタイプ:', message.type);
    }
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ウェーブ開始ボタンは廃止（自動開始）

    // バトル画面ではクリック操作は不要（オート攻撃）

    // アップグレードボタン群（サイドパネル）
    const bindUpgradeButtons = () => {
      document.querySelectorAll('.upgrade-btn').forEach((btn) => {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
          const up = btn.getAttribute('data-up');
          if (!up) return;
          this.sendMessage({ type: 'UPGRADE', upgradeType: up });
        });
      });
    };
    bindUpgradeButtons();

    // サイドパネルトグル
    const toggle = document.getElementById('upgrade-panel-toggle');
    const panel = document.getElementById('upgrade-panel');
    const backdrop = document.getElementById('upgrade-backdrop');
    const closeBtn = document.getElementById('upgrade-close');
    if (toggle && panel) {
      toggle.addEventListener('click', () => {
        panel.classList.toggle('open');
        const isOpen = panel.classList.contains('open');
        if (backdrop) backdrop.classList.toggle('show', isOpen);
        // パネルが開いている間はトグルボタンを非表示
        if (isOpen) {
          toggle.style.display = 'none';
        } else {
          toggle.style.display = '';
        }
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        panel && panel.classList.remove('open');
        backdrop.classList.remove('show');
        // パネルを閉じたらトグルボタン再表示
        if (toggle) toggle.style.display = '';
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel && panel.classList.remove('open');
        backdrop && backdrop.classList.remove('show');
        // パネルを閉じたらトグルボタン再表示
        if (toggle) toggle.style.display = '';
      });
    }
    // Escで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        panel && panel.classList.remove('open');
        backdrop && backdrop.classList.remove('show');
        // パネルを閉じたらトグルボタン再表示
        if (toggle) toggle.style.display = '';
      }
      if (e.key.toLowerCase() === 'u') {
        // Uキーで開閉
        if (panel) {
          const willOpen = !panel.classList.contains('open');
          panel.classList.toggle('open');
          backdrop && backdrop.classList.toggle('show', willOpen);
          // 開く→トグル非表示、閉じる→再表示
          if (toggle) toggle.style.display = willOpen ? 'none' : '';
        }
      }
    });
    // 右端付近にマウスが来たらトグルを一時的に表示
    const toggleBtn = toggle;
    let hideTimer = null;
    const showToggle = () => {
      if (!toggleBtn) return;
      toggleBtn.style.opacity = '1';
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        toggleBtn.style.opacity = panel && panel.classList.contains('open') ? '0' : '.2';
      }, 1500);
    };
    document.addEventListener('mousemove', (e) => {
      if (!toggleBtn) return;
      const nearRight = (window.innerWidth - e.clientX) < 80;
      // パネルが閉じている時のみ、右端ホバーでトグルを見せる
      if (nearRight && !(panel && panel.classList.contains('open'))) showToggle();
    });
    // タブ切り替え
    const tabAttack = document.getElementById('tab-attack');
    const tabDefense = document.getElementById('tab-defense');
    const panelAttack = document.getElementById('panel-attack');
    const panelDefense = document.getElementById('panel-defense');
    const activateTab = (which) => {
      if (!tabAttack || !tabDefense || !panelAttack || !panelDefense) return;
      if (which === 'attack') {
        tabAttack.classList.add('active');
        tabDefense.classList.remove('active');
        panelAttack.style.display = '';
        panelDefense.style.display = 'none';
      } else {
        tabAttack.classList.remove('active');
        tabDefense.classList.add('active');
        panelAttack.style.display = 'none';
        panelDefense.style.display = '';
      }
    };
    tabAttack && tabAttack.addEventListener('click', () => activateTab('attack'));
    tabDefense && tabDefense.addEventListener('click', () => activateTab('defense'));

    // リトライボタン
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // オーバーレイを隠す
        const gameOverEl = document.getElementById('game-over');
        if (gameOverEl) {
          gameOverEl.classList.remove('show');
          gameOverEl.classList.remove('shown');
        }
        // リトライ送信
        this.sendMessage({ type: 'RETRY' });
        // 自動でウェーブ開始
        setTimeout(() => {
          this.sendMessage({ type: 'START_WAVE' });
        }, 150);
      });
    }
  }

  /**
   * Cursor+モードの切り替え
   */
  toggleCursorAttackMode() {
    this.cursorAttackMode = !this.cursorAttackMode;
    const cursorAttackBtn = document.getElementById('cursor-attack-btn');
    
    if (cursorAttackBtn && this.cursorAttackMode) {
      cursorAttackBtn.textContent = 'Cursor+ (クリックして敵を選択)';
      cursorAttackBtn.classList.add('cursor-attack-active');
      document.body.style.cursor = 'crosshair';
    } else if (cursorAttackBtn) {
      cursorAttackBtn.textContent = 'Cursor+ (使用可能)';
      cursorAttackBtn.classList.remove('cursor-attack-active');
      document.body.style.cursor = 'default';
    }
  }

  /**
   * Cursor+攻撃を実行
   * @param {number} enemyId 攻撃対象の敵ID
   */
  performCursorAttack(enemyId) {
    if (!this.cursorAttackMode) {
      return;
    }

    this.sendMessage({
      type: 'CURSOR_ATTACK',
      targetId: enemyId
    });

    // Cursor+モードを解除
    this.cursorAttackMode = false;
    const cursorAttackBtn = document.getElementById('cursor-attack-btn');
    if (cursorAttackBtn) {
      cursorAttackBtn.textContent = 'Cursor+ (使用済み)';
      cursorAttackBtn.classList.remove('cursor-attack-active');
      cursorAttackBtn.disabled = true;
    }
    document.body.style.cursor = 'default';
  }

  /**
   * サーバーにメッセージを送信
   * @param {Object} message 送信するメッセージ
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket接続が確立されていません');
    }
  }

  /**
   * 画面を描画更新
   */
  render() {
    if (!this.gameState) {
      return;
    }

    // 情報パネルの更新
    this.updateInfoPanel();
    
    // 攻撃エフェクト（レーザー）の描画
    this.renderAttackEffects();
    
    // 敵の描画
    this.renderEnemies();
    
    // タワーの射程範囲を更新
    this.updateTowerRange();
    
    // ゲームオーバー表示
    if (this.gameState.gameOver) {
      this.showGameOver();
    }

    // ボタンの状態更新
    this.updateButtons();

    // アップグレードの現在Lvと次コストを表示
    if (this.gameState.upgrades && this.gameState.upgradeCosts) {
      const cash = this.gameState.cash ?? 0;
      const meta = this.gameState.meta ?? {};
      const metaMap = { damage: 'damage', range: 'range', critChance: 'critChance', health: 'health' };
      Object.keys(this.gameState.upgrades).forEach((key) => {
        const tempLevel = this.gameState.upgrades[key] ?? 0;
        const metaLevel = Object.keys(metaMap).some((m) => metaMap[m] === key) ? (meta[key] ?? 0) : 0;
        const effectiveLevel = tempLevel + metaLevel;
        const cost = this.gameState.upgradeCosts[key] ?? 0;
        // 合計レベル表示（メタ+一時）
        const lvEl = document.querySelector(`[data-lv="${key}"]`);
        if (lvEl) lvEl.textContent = String(effectiveLevel);
        // コスト表示
        const costEl = document.querySelector(`[data-cost="${key}"]`);
        if (costEl) costEl.textContent = String(cost);
        // ボタン有効/無効
        const btn = document.querySelector(`.upgrade-btn[data-up="${key}"]`);
        if (btn) (btn).disabled = cash < cost;
      });
    }
  }

  /**
   * 情報パネルを更新
   */
  updateInfoPanel() {
    // ウェーブ表示
    document.getElementById('wave-display').textContent = this.gameState.wave;

    // 通貨表示
    const cashEl = document.getElementById('cash-display');
    const coinEl = document.getElementById('coin-display');
    const gemEl = document.getElementById('gem-display');
    if (cashEl) cashEl.textContent = this.gameState.cash ?? 0;
    if (coinEl) coinEl.textContent = this.gameState.coin ?? 0;
    if (gemEl) gemEl.textContent = this.gameState.gem ?? 0;

    // タワーHP表示
    const hpPercent = (this.gameState.tower.hp / this.gameState.tower.maxHp) * 100;
    document.getElementById('tower-hp-fill').style.width = `${hpPercent}%`;
    document.getElementById('tower-hp-text').textContent = 
      `${Math.max(0, Math.round(this.gameState.tower.hp))} / ${this.gameState.tower.maxHp}`;

    // ウェーブステータス表示
    const waveStatusEl = document.getElementById('wave-status');
    if (this.gameState.isWaveActive) {
      waveStatusEl.textContent = `ウェーブ ${this.gameState.wave} 進行中`;
      waveStatusEl.style.background = 'rgba(78, 205, 196, 0.3)';
    } else if (this.gameState.isWavePaused) {
      waveStatusEl.textContent = `ウェーブ ${this.gameState.wave} クリア！ 次のウェーブを開始してください`;
      waveStatusEl.style.background = 'rgba(255, 215, 0, 0.3)';
    } else {
      waveStatusEl.textContent = 'ウェーブを開始してください';
      waveStatusEl.style.background = 'rgba(169, 169, 169, 0.3)';
    }

    // ボタンの有効/無効（キャッシュで判定できればベターだが、簡易化。都度サーバー側で弾く）
  }

  /**
   * 攻撃エフェクト（レーザー）を描画
   */
  renderAttackEffects() {
    if (!this.gameState.attackEffects) {
      return;
    }

    const gameCanvas = document.getElementById('game-canvas');
    const currentEffectIds = new Set();
    const currentTime = Date.now();
    const effectDuration = 200; // ミリ秒

    // 既存のエフェクトを削除（時間経過または新しいものに置き換え）
    this.attackEffectElements.forEach((element, effectId) => {
      element.remove();
      this.attackEffectElements.delete(effectId);
    });

    // 新しいエフェクトを描画
    this.gameState.attackEffects.forEach((effect, index) => {
      const elapsed = currentTime - effect.startTime;
      if (elapsed >= effectDuration) {
        return; // 時間切れのエフェクトはスキップ
      }

      const effectId = `effect-${effect.startTime}-${index}`;
      currentEffectIds.add(effectId);

      // ゲーム座標を画面座標に変換
      const fromPos = this.gameToScreen(effect.fromX, effect.fromY);
      const toPos = this.gameToScreen(effect.toX, effect.toY);

      // レーザー要素を作成
      const laserEl = document.createElement('div');
      laserEl.className = 'laser-effect';
      if (effect.isCursorAttack) {
        laserEl.classList.add('laser-cursor-attack');
      }

      // 距離と角度を計算
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // レーザーのスタイルを設定
      laserEl.style.width = `${distance}px`;
      laserEl.style.left = `${fromPos.x}px`;
      laserEl.style.top = `${fromPos.y}px`;
      laserEl.style.transformOrigin = '0 50%';
      laserEl.style.transform = `rotate(${angle}deg)`;
      laserEl.style.opacity = 1 - (elapsed / effectDuration); // フェードアウト

      gameCanvas.appendChild(laserEl);
      this.attackEffectElements.set(effectId, laserEl);
    });
  }

  /**
   * 敵を描画（360度対応）
   */
  renderEnemies() {
    const gameCanvas = document.getElementById('game-canvas');
    const currentEnemyIds = new Set(this.gameState.enemies.map(e => e.id));

    // 削除された敵の要素を削除
    this.enemyElements.forEach((element, enemyId) => {
      if (!currentEnemyIds.has(enemyId)) {
        element.remove();
        this.enemyElements.delete(enemyId);
      }
    });

    // 敵を描画・更新
    if (this.gameState.enemies) {
      this.gameState.enemies.forEach((enemy) => {
        let enemyEl = this.enemyElements.get(enemy.id);

        if (!enemyEl) {
          // 新しい敵の要素を作成
          enemyEl = document.createElement('div');
          enemyEl.className = 'enemy';
          enemyEl.dataset.enemyId = enemy.id;
          
          // HPバーを追加
          const hpBar = document.createElement('div');
          hpBar.className = 'hp-bar';
          const hpFill = document.createElement('div');
          hpFill.className = 'hp-fill';
          hpBar.appendChild(hpFill);
          enemyEl.appendChild(hpBar);

          gameCanvas.appendChild(enemyEl);
          this.enemyElements.set(enemy.id, enemyEl);
        }

        // 敵の種類に応じた見た目を設定
        enemyEl.className = 'enemy';
        if (enemy.type === 'ranged') {
          enemyEl.classList.add('enemy-ranged');
        } else if (enemy.type === 'protector') {
          enemyEl.classList.add('enemy-miniboss'); // プロテクターに中ボススタイル
        } else if (enemy.type === 'boss') {
          enemyEl.classList.add('enemy-boss');
        }

        // サイズを設定
        const size = enemy.size || 50;
        enemyEl.style.width = `${size}px`;
        enemyEl.style.height = `${size}px`;

        // ゲーム座標を画面座標に変換
        const screenPos = this.gameToScreen(enemy.x, enemy.y);

        // 敵の位置を更新
        enemyEl.style.left = `${screenPos.x}px`;
        enemyEl.style.top = `${screenPos.y}px`;

        // HPバーを更新
        const hpFill = enemyEl.querySelector('.hp-fill');
        const hpPercent = (enemy.hp / enemy.maxHp) * 100;
        hpFill.style.width = `${hpPercent}%`;

        // 敵の種類名を取得
        const enemyNames = {
          'basic': 'ベーシック',
          'fast': '高速',
          'tank': '戦車',
          'ranged': '遠隔',
          'boss': 'ボス',
          'protector': 'プロテクター',
          'vampire': '吸血鬼',
          'ray': 'レイ',
          'scatter': 'スキャッター'
        };
        const enemyName = enemyNames[enemy.type] || enemy.type;
        
        // 敵の表示内容（名前とHPを表示）
        const existingText = Array.from(enemyEl.childNodes).find(
          node => node.nodeType === 3 && node.textContent.trim()
        );
        
        const displayText = `${enemyName}\n${Math.round(enemy.hp)}`;
        if (!existingText) {
          const textNode = document.createTextNode(displayText);
          enemyEl.appendChild(textNode);
        } else {
          existingText.textContent = displayText;
        }

        // HPが低い場合は色を変更
        if (hpPercent < 30) {
          enemyEl.style.background = 'linear-gradient(135deg, #ff4444, #cc0000)';
        } else {
          enemyEl.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
        }
      });
    }
  }

  /**
   * ボタンの状態を更新
   */
  updateButtons() {
    const startWaveBtn = document.getElementById('start-wave-btn');
    const cursorAttackBtn = document.getElementById('cursor-attack-btn');

    // ウェーブ開始ボタン
    if (startWaveBtn) {
      if (this.gameState.isWaveActive && !this.gameState.isWavePaused) {
        startWaveBtn.disabled = true;
        startWaveBtn.textContent = 'ウェーブ進行中...';
      } else {
        startWaveBtn.disabled = false;
        startWaveBtn.textContent = 
          this.gameState.isWavePaused ? '次のウェーブ開始' : 'ウェーブ開始';
      }
    }

    // Cursor+ボタン
    if (cursorAttackBtn) {
      if (this.gameState.cursorAttackAvailable && this.gameState.isWaveActive) {
        cursorAttackBtn.disabled = false;
        if (!this.cursorAttackMode) {
          cursorAttackBtn.textContent = 'Cursor+ (使用可能)';
          cursorAttackBtn.classList.remove('cursor-attack-active');
        }
      } else {
        cursorAttackBtn.disabled = true;
        cursorAttackBtn.textContent = 'Cursor+ (使用不可)';
        cursorAttackBtn.classList.remove('cursor-attack-active');
      }
    }
  }

  /**
   * ゲームオーバーを表示
   */
  showGameOver() {
    const gameOverEl = document.getElementById('game-over');
    if (!gameOverEl) return;
    
    // 一度だけ表示
    if (gameOverEl.classList.contains('shown')) return;
    gameOverEl.classList.add('shown');
    
    // オーバーレイを表示
    gameOverEl.classList.add('show');
    
    // 結果を表示
    if (this.gameState && this.gameState.stats) {
      document.getElementById('game-over-wave').textContent = this.gameState.stats.lastWave ?? '0';
      document.getElementById('game-over-best').textContent = this.gameState.stats.bestWave ?? '0';
      document.getElementById('game-over-killer').textContent = this.gameState.stats.lastKiller ?? '不明';
      document.getElementById('game-over-coin').textContent = this.gameState.stats.coinRun ?? '0';
    }
    
    // リトライボタン（既にバインド済み）
    // ホームボタン
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn && !homeBtn.dataset.bound) {
      homeBtn.dataset.bound = '1';
      homeBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }
  }
}

// ゲームクライアントを起動
const gameClient = new GameClient();
