/**
 * ゲームロジックの実装
 * ゲームの状態管理、戦闘計算、敵の移動、ウェーブ制御を処理
 * 360度タワーディフェンス対応
 * The Tower準拠の敵タイプ実装
 */

class GameLogic {
  constructor() {
    // ゲームの基本状態
    this.tower = {
      x: 0, // タワーは常に中心（0, 0）
      y: 0,
      hp: 100,
      maxHp: 100,
      damage: 5,
      range: 300, // ピクセル単位（射程距離）
      attackInterval: 1000, // ミリ秒
      lastAttackTime: 0
    };

    // 通貨
    this.cash = 0; // 常に得られる基本ポイント
    this.coin = 0; // 一部の敵から追加で得られるポイント
    this.gem = 0;  // 特別報酬（現段階ではドロップなし）
    this.wave = 1;
    this.enemies = []; // 敵のリスト
    this.enemyIdCounter = 0;
    this.isWaveActive = false;
    this.isWavePaused = false;

    // Cursor+スキルの状態
    this.cursorAttackAvailable = true;

    // 攻撃エフェクト（レーザー）の管理
    this.attackEffects = [];
    this.attackEffectDuration = 200; // ミリ秒

    // 敵のプロジェクトile（遠距離部隊、レイの攻撃）
    this.projectiles = [];

    // 敵の設定
    this.enemyBaseSpeed = 0.5; // ベーシックの速度
    this.enemyBaseHp = 20; // ベーシックのHP
    this.towerRadius = 25; // タワーの半径（敵がここまで来るとタワーに到達）
    this.spawnDistance = 600; // 敵の生成距離（中心からの距離）
    
    // 敵生成のタイミング管理
    this.spawnTimer = 0;
    this.spawnInterval = 2000; // 2秒ごとに敵を生成

    // ボスの出現管理（10ウェーブに1回）
    this.lastBossWave = 0;
    this.bossCount = 0;
    this.protectorCount = 0;

    // エリート敵のカウンター
    this.eliteCount = 0;

    // アップグレード状態
    this.upgrades = {
      damage: 0,
      attackSpeed: 0,
      critChance: 0,
      critDamage: 0,
      range: 0,
      damagePerMeter: 0,
      multishotChance: 0,
      multishotCount: 0, // 実数は+1されるイメージ（0=1本）
      // 防御系
      health: 0,
      healthRegen: 0,
      defenseChance: 0,
      absoluteDefense: 0,
      thorns: 0,
      lifesteal: 0,
      knockbackChance: 0,
      knockbackPower: 0
    };
    this.baseCosts = {
      damage: 5,
      attackSpeed: 5,
      critChance: 5,
      critDamage: 5,
      range: 5,
      damagePerMeter: 5,
      multishotChance: 5,
      multishotCount: 5,
      // 防御系
      health: 10,
      healthRegen: 8,
      defenseChance: 12,
      absoluteDefense: 12,
      thorns: 10,
      lifesteal: 12,
      knockbackChance: 10,
      knockbackPower: 10
    };
    // 一時アップグレードの上限（バランス設計）
    this.upgradeMaxLevels = {
      damage: 99,
      attackSpeed: 40,       // 最短間隔下限を守る
      critChance: 10,        // +5%×10=50%上限
      critDamage: 40,
      range: 30,
      damagePerMeter: 40,
      multishotChance: 12,   // +5%×12=60%上限
      multishotCount: 7,     // 1→8本まで
      health: 50,
      healthRegen: 40,
      defenseChance: 17,     // +3%×17≒51%（実際は50%キャップ）
      absoluteDefense: 40,
      thorns: 40,
      lifesteal: 15,         // +2%×15=30%上限
      knockbackChance: 12,   // +5%×12=60%
      knockbackPower: 30
    };
    this.regenAccumulator = 0;

    // メタ（恒久）アップグレード
    this.meta = {
      damage: 0,
      health: 0,
      range: 0,
      critChance: 0
    };
    this.metaBaseCosts = {
      damage: { coin: 20 },
      health: { coin: 20 },
      range: { coin: 20 },
      critChance: { gem: 1 }
    };
    // 射程にメタ反映
    this.tower.range = 300 + this.meta.range * 10 + this.upgrades.range * 20;

    // ラン統計
    this.bestWave = 0;
    this.lastWave = 0;
    this.lastKiller = '';
    this.coinRun = 0; // 今回のランで獲得したコイン
    this.lastCoinRun = 0; // 前回のランで獲得したコイン（表示用）
  }

  /** ゲームをリセット（リトライ） */
  resetGame() {
    // 前回のランのコインを保存
    if (this.tower.hp <= 0) {
      this.lastCoinRun = this.coinRun;
    }
    // 敵・弾・エフェクトをクリア
    this.enemies = [];
    this.projectiles = [];
    this.attackEffects = [];
    this.enemyIdCounter = 0;
    this.spawnTimer = 0;
    // 状態リセット
    this.isWaveActive = false;
    this.isWavePaused = false;
    this.cursorAttackAvailable = true;
    // カウンター類
    this.bossCount = 0;
    this.protectorCount = 0;
    this.eliteCount = 0;
    // タワー回復
    this.tower.maxHp = this.getMaxHp();
    this.tower.hp = this.getMaxHp();
    this.tower.lastAttackTime = 0;
    // ウェーブは1に戻す
    this.wave = 1;
    // ランの通貨（キャッシュ）はリセット、コインは引き継ぎ
    this.cash = 0;
    this.coinRun = 0; // 新しいランのコイン
    // 一時アップグレードは全てリセット
    if (this.upgrades) {
      Object.keys(this.upgrades).forEach((k) => { this.upgrades[k] = 0; });
    }
    // 射程など動的反映
    this.tower.range = 300 + (this.meta?.range || 0) * 10 + this.upgrades.range * 20;
  }

  /** アップグレードのコスト */
  getUpgradeCost(type) {
    const level = this.upgrades[type] ?? 0;
    switch (type) {
      // 攻撃系
      case 'damage':
        return Math.round(5 * Math.pow(1 + level, 1.3));
      case 'attackSpeed':
        return Math.round(8 * Math.pow(1 + level, 1.5));
      case 'critChance':
        return Math.round(10 * Math.pow(1 + level, 1.8));
      case 'critDamage':
        return Math.round(8 * Math.pow(1 + level, 1.4));
      case 'range':
        return Math.round(6 * (1 + level * 0.9) + level * level * 0.3);
      case 'damagePerMeter':
        return Math.round(6 * Math.pow(1 + level, 1.4));
      case 'multishotChance':
        return Math.round(12 * Math.pow(1 + level, 1.7));
      case 'multishotCount':
        return Math.round(20 * Math.pow(1.6, level));
      // 防御系
      case 'health':
        return Math.round(10 * Math.pow(1 + level, 1.2));
      case 'healthRegen':
        return Math.round(8 * Math.pow(1 + level, 1.35));
      case 'defenseChance':
        return Math.round(12 * Math.pow(1 + level, 1.6));
      case 'absoluteDefense':
        return Math.round(12 * Math.pow(1 + level, 1.45));
      case 'thorns':
        return Math.round(10 * Math.pow(1 + level, 1.35));
      case 'lifesteal':
        return Math.round(12 * Math.pow(1 + level, 1.7));
      case 'knockbackChance':
        return Math.round(10 * Math.pow(1 + level, 1.5));
      case 'knockbackPower':
        return Math.round(10 * Math.pow(1 + level, 1.3));
      default:
        return (this.baseCosts[type] ?? 5) + level * 5;
    }
  }

  // メタコスト
  getMetaCost(type) {
    const level = (this.meta && this.meta[type]) ? this.meta[type] : 0;
    // ハードル高めの成長曲線（指数/準指数）
    switch (type) {
      case 'damage': {
        // コイン: 20 * 1.8^Lv（急峻）
        const coin = Math.max(20, Math.round(20 * Math.pow(1.8, level)));
        return { coin, gem: 0 };
      }
      case 'health': {
        // コイン: 20 * 1.75^Lv
        const coin = Math.max(20, Math.round(20 * Math.pow(1.75, level)));
        return { coin, gem: 0 };
      }
      case 'range': {
        // コイン: 20 * 1.7^Lv
        const coin = Math.max(20, Math.round(20 * Math.pow(1.7, level)));
        return { coin, gem: 0 };
      }
      case 'critChance': {
        // ジェム: 序盤は緩やか→中盤以降急増（1 + ceil(1.5^Lv / 2)）
        const gem = Math.max(1, Math.ceil(Math.pow(1.5, level) / 2));
        return { coin: 0, gem };
      }
      default: {
        // フォールバック: やや厳しめの指数
        const base = this.metaBaseCosts[type] || { coin: 20 };
        const coin = base.coin ? Math.round(base.coin * Math.pow(1.6, level)) : 0;
        const gem = base.gem ? Math.max(1, Math.round(base.gem * Math.pow(1.3, level))) : 0;
        return { coin, gem };
      }
    }
  }

  // メタ購入
  buyMeta(type) {
    if (!this.meta || !(type in this.meta)) return false;
    const cost = this.getMetaCost(type);
    if (this.coin < cost.coin || this.gem < cost.gem) return false;
    this.coin -= cost.coin;
    this.gem -= cost.gem;
    this.meta[type] += 1;
    // 反映
    if (type === 'range') {
      this.tower.range = 300 + this.meta.range * 10 + this.upgrades.range * 20;
    }
    if (type === 'health') {
      const newMax = this.getMaxHp();
      this.tower.maxHp = newMax;
      this.tower.hp = Math.min(newMax, this.tower.hp + 50);
    }
    return true;
  }

  /** アップグレード購入 */
  upgrade(type) {
    if (!(type in this.upgrades)) return false;
    const cost = this.getUpgradeCost(type);
    if (this.cash < cost) return false;
    // 上限
    const maxLv = this.upgradeMaxLevels[type];
    if (typeof maxLv === 'number' && (this.upgrades[type] ?? 0) >= maxLv) return false;
    if (type === 'critChance' && this.getCritChance() >= 0.5) return false; // 50%上限のセーフティ

    this.cash -= cost;
    this.upgrades[type] += 1;
    // 反映
    if (type === 'damage') {
      // 表示用の基礎ダメージは据え置き、計算時に加味
    } else if (type === 'attackSpeed') {
      // 反映は計算時
    } else if (type === 'range') {
      this.tower.range = 300 + this.upgrades.range * 20;
    } else if (type === 'health') {
      const oldLevel = (this.upgrades.health - 1) || 0;
      const oldMax = 100 + (this.meta?.health || 0) * 50 + oldLevel * 20; // 1レベル前の最大値
      const newMax = this.getMaxHp();
      this.tower.maxHp = newMax;
      // 最大値増加分だけ回復
      this.tower.hp = Math.min(newMax, this.tower.hp + (newMax - oldMax));
    }
    return true;
  }

  // 派生ステータス取得
  getDamage() {
    // メタ強化（damage）を加味
    const metaBonus = (this.meta && this.meta.damage ? this.meta.damage : 0) * 2;
    return this.tower.damage + this.upgrades.damage * 2 + metaBonus;
  }
  getAttackInterval() {
    const reduced = 1000 * Math.pow(0.95, this.upgrades.attackSpeed); // 1レベル毎に-5%
    return Math.max(200, Math.floor(reduced));
  }
  getCritChance() {
    const meta = (this.meta && this.meta.critChance ? this.meta.critChance : 0) * 0.02;
    return Math.min(0.5, this.upgrades.critChance * 0.05 + meta);
  }
  getCritMultiplier() {
    return 1.5 + this.upgrades.critDamage * 0.25;
  }
  getDamagePerMeterMultiplier(distancePx) {
    const per100m = this.upgrades.damagePerMeter * 0.02; // 1レベル=+2%/100px
    return 1 + per100m * (distancePx / 100);
  }
  getMultishotChance() {
    return Math.min(0.6, this.upgrades.multishotChance * 0.05);
  }
  getMultishotCount() {
    return 1 + this.upgrades.multishotCount; // 1~8
  }

  // メタアップグレード 反映（射程）
  getBaseRange() {
    const metaRange = (this.meta && this.meta.range ? this.meta.range : 0) * 10;
    return 300 + metaRange;
  }

  // 防御系計算
  getMaxHp() {
    const baseHp = 100; // ベースHP
    const metaHp = (this.meta && this.meta.health ? this.meta.health : 0) * 50;
    const tempHp = this.upgrades.health * 20;
    return baseHp + metaHp + tempHp;
  }
  getRegenPerSec() {
    return this.upgrades.healthRegen * 1; // 1レベルあたり1HP/秒
  }
  getBlockChance() {
    return Math.min(0.5, this.upgrades.defenseChance * 0.03); // 最大50%
  }
  getAbsoluteDefense() {
    return this.upgrades.absoluteDefense * 3; // 1レベル=3ダメ軽減（ブロック時）
  }
  getThornsDamage() {
    return this.upgrades.thorns * 5; // 1レベル=+5 とげダメージ（接触時）
  }
  getLifestealPercent() {
    return Math.min(0.3, this.upgrades.lifesteal * 0.02); // 最大30%
  }
  getKnockbackChance() {
    return Math.min(0.6, this.upgrades.knockbackChance * 0.05);
  }
  getKnockbackPower() {
    return 20 + this.upgrades.knockbackPower * 10; // px
  }

  /**
   * 敵タイプに応じたコインドロップ量
   */
  getCoinDropForType(type) {
    switch (type) {
      case 'basic':
        return 0;
      case 'fast':
        return 2;
      case 'tank':
        return 4;
      case 'ranged':
        return 2;
      case 'boss':
        return 5;
      case 'protector':
        return 3;
      case 'vampire':
        return 4;
      case 'ray':
        return 4;
      case 'scatter':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * 敵の種類をランダムに選択（The Tower準拠）
   */
  selectEnemyType() {
    // 10ウェーブごとにボスを出す
    if (this.wave % 10 === 0 && this.wave !== this.lastBossWave && this.bossCount === 0) {
      this.lastBossWave = this.wave;
      return 'boss';
    }

    // エリート敵が一定数以上なら通常敵のみ
    if (this.eliteCount >= 3) {
      return this.selectNormalEnemyType();
    }

    // エリート敵の出現確率（低確率）
    const eliteChance = Math.random();
    if (eliteChance < 0.15) {
      return this.selectEliteEnemyType();
    }

    // プロテクターの出現（中確率、制限あり）
    if (this.protectorCount < 2 && eliteChance < 0.25) {
      this.protectorCount++;
      return 'protector';
    }

    // 通常敵
    return this.selectNormalEnemyType();
  }

  /**
   * 通常敵の種類を選択
   */
  selectNormalEnemyType() {
    const rand = Math.random();
    if (rand < 0.5) {
      return 'basic'; // 50%
    } else if (rand < 0.7) {
      return 'fast'; // 20%
    } else if (rand < 0.85) {
      return 'tank'; // 15%
    } else {
      return 'ranged'; // 15%
    }
  }

  /**
   * エリート敵の種類を選択
   */
  selectEliteEnemyType() {
    const rand = Math.random();
    if (rand < 0.33) {
      this.eliteCount++;
      return 'vampire';
    } else if (rand < 0.66) {
      this.eliteCount++;
      return 'ray';
    } else {
      this.eliteCount++;
      return 'scatter';
    }
  }

  /**
   * ウェーブを開始する
   */
  startWave() {
    if (this.isWaveActive && !this.isWavePaused) {
      return; // すでにウェーブが進行中
    }

    if (this.isWavePaused) {
      // ポーズ解除してウェーブを再開
      this.isWavePaused = false;
      this.wave++;
      this.enemies = [];
      this.enemyIdCounter = 0;
      this.spawnTimer = 0;
      this.cursorAttackAvailable = true;
      this.attackEffects = [];
      this.projectiles = [];
      // カウンターをリセット（新しいウェーブなので）
      this.bossCount = 0;
      this.protectorCount = 0;
      this.eliteCount = 0;
      return;
    }

    // 新しいウェーブ開始
    this.wave = 1;
    this.enemies = [];
    this.enemyIdCounter = 0;
    this.isWaveActive = true;
    this.isWavePaused = false;
    this.spawnTimer = 0;
    this.cursorAttackAvailable = true;
    // タワーHPを満タンに
    this.tower.maxHp = this.getMaxHp();
    this.tower.hp = this.tower.maxHp;
    this.attackEffects = [];
    this.projectiles = [];
    this.bossCount = 0;
    this.protectorCount = 0;
    this.eliteCount = 0;
    
    // 最初の敵をすぐに生成
    this.spawnEnemy();
  }

  /**
   * 敵を生成する（360度のランダムな角度から）
   */
  spawnEnemy() {
    const baseHp = this.enemyBaseHp;
    const baseSpeed = this.enemyBaseSpeed;
    const enemyType = this.selectEnemyType();
    
    let enemyHp, enemySpeed, enemySize, enemyData = {};
    
    switch (enemyType) {
      case 'basic':
        enemyHp = baseHp;
        enemySpeed = baseSpeed;
        enemySize = 50;
        break;
      
      case 'fast':
        enemyHp = baseHp;
        enemySpeed = baseSpeed * 2; // 2倍速
        enemySize = 45; // 少し小さい
        break;
      
      case 'tank':
        enemyHp = baseHp * 5; // 5倍HP
        enemySpeed = baseSpeed * 0.5; // 半分の速さ
        enemySize = 60;
        break;
      
      case 'ranged':
        enemyHp = baseHp;
        enemySpeed = baseSpeed;
        enemySize = 50;
        enemyData.stopped = false;
        enemyData.attackCooldown = 0;
        enemyData.attackInterval = 2000; // 2秒ごとに攻撃
        break;
      
      case 'boss':
        enemyHp = baseHp * 20; // 20倍HP
        enemySpeed = baseSpeed * 0.3; // 非常に遅い
        enemySize = 120;
        enemyData.knockbackImmune = true; // ノックバック無効
        this.bossCount++;
        break;
      
      case 'protector':
        enemyHp = baseHp * 3;
        enemySpeed = baseSpeed * 0.7;
        enemySize = 70;
        enemyData.hasBarrier = true; // バリアあり（即死無効）
        break;
      
      case 'vampire':
        enemyHp = baseHp * 2; // 2倍HP
        enemySpeed = baseSpeed * 0.8;
        enemySize = 55;
        enemyData.isElite = true; // エリート敵
        enemyData.knockbackResist = true; // ノックバック効きにくい
        enemyData.vampireCooldown = 0;
        enemyData.vampireInterval = 3000; // 3秒ごとに吸血
        break;
      
      case 'ray':
        enemyHp = baseHp;
        enemySpeed = baseSpeed;
        enemySize = 60;
        enemyData.isElite = true;
        enemyData.knockbackImmune = true; // ノックバック無効
        enemyData.charging = false;
        enemyData.chargeTime = 0;
        enemyData.chargeDuration = 30000; // 30秒チャージ
        break;
      
      case 'scatter':
        enemyHp = baseHp * 2; // 2倍HP
        enemySpeed = baseSpeed * 0.7;
        enemySize = 55;
        enemyData.isElite = true;
        enemyData.knockbackResist = true;
        enemyData.splitCount = 0; // 分裂回数
        enemyData.maxSplits = 4; // 最大4回分裂
        break;
    }
    
    // ランダムな角度（0～2π）で生成
    const angle = Math.random() * Math.PI * 2;
    
    // 外周の位置を計算
    const x = Math.cos(angle) * this.spawnDistance;
    const y = Math.sin(angle) * this.spawnDistance;
    
    const enemy = {
      id: this.enemyIdCounter++,
      x: x,
      y: y,
      hp: enemyHp,
      maxHp: enemyHp,
      speed: enemySpeed,
      type: enemyType,
      size: enemySize,
      ...enemyData
    };
    this.enemies.push(enemy);
  }

  /**
   * 2点間の距離を計算
   */
  getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * プロジェクトileを更新
   */
  updateProjectiles(deltaTime) {
    this.projectiles = this.projectiles.filter((projectile) => {
      // プロジェクトileの移動
      const dx = projectile.targetX - projectile.x;
      const dy = projectile.targetY - projectile.y;
      const distance = this.getDistance(projectile.x, projectile.y, projectile.targetX, projectile.targetY);
      
      if (distance > 5) {
        const speed = projectile.speed * (deltaTime / 16); // フレーム補正
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        projectile.x += normalizedX * speed;
        projectile.y += normalizedY * speed;
        return true; // まだ移動中
      } else {
        // タワーに到達したらダメージ（防御適用）
        let dmg = typeof projectile.damage === 'number' ? projectile.damage : 5;
        // ブロック判定
        if (Math.random() < this.getBlockChance()) {
          dmg = Math.max(0, dmg - this.getAbsoluteDefense());
        }
        this.tower.hp -= dmg;
        if (this.tower.hp < 0) this.tower.hp = 0;
        // キラー記録とウェーブ更新
        if (this.tower.hp <= 0) {
          this.lastKiller = projectile.ownerType || 'unknown';
          this.lastWave = this.wave;
          this.bestWave = Math.max(this.bestWave, this.lastWave);
        }
        return false; // 削除
      }
    });
  }

  /**
   * 敵を分裂させる（スキャッター）
   */
  splitEnemy(enemy) {
    if (enemy.splitCount >= enemy.maxSplits) {
      return; // 分裂回数上限
    }

    // 2つの新しい敵を生成
    for (let i = 0; i < 2; i++) {
      const angle = Math.atan2(enemy.y, enemy.x) + (i === 0 ? -0.3 : 0.3);
      const distance = this.getDistance(0, 0, enemy.x, enemy.y) * 0.8;
      const newX = Math.cos(angle) * distance;
      const newY = Math.sin(angle) * distance;

      const newEnemy = {
        id: this.enemyIdCounter++,
        x: newX,
        y: newY,
        hp: enemy.hp / 2, // 半分のHP
        maxHp: enemy.maxHp / 2,
        speed: enemy.speed,
        type: enemy.type,
        size: enemy.size * 0.8,
        isElite: enemy.isElite,
        knockbackResist: enemy.knockbackResist,
        splitCount: enemy.splitCount + 1,
        maxSplits: enemy.maxSplits
      };
      this.enemies.push(newEnemy);
    }
  }

  /**
   * ゲームループの更新処理
   * @param {number} deltaTime 経過時間（ミリ秒）
   */
  update(deltaTime) {
    if (!this.isWaveActive || this.isWavePaused) {
      return;
    }

    const currentTime = Date.now();

    // 攻撃エフェクトの更新
    this.attackEffects = this.attackEffects.filter((effect) => {
      return (currentTime - effect.startTime) < this.attackEffectDuration;
    });

    // プロジェクトileの更新
    this.updateProjectiles(deltaTime);

    // ヘルス回復（1秒あたり）
    this.regenAccumulator = (this.regenAccumulator || 0) + deltaTime;
    if (this.regenAccumulator >= 1000) {
      const ticks = Math.floor(this.regenAccumulator / 1000);
      this.regenAccumulator -= ticks * 1000;
      const regenPerSec = this.getRegenPerSec();
      if (regenPerSec > 0) {
        const newMax = this.getMaxHp();
        this.tower.maxHp = newMax;
        this.tower.hp = Math.min(newMax, this.tower.hp + regenPerSec * ticks);
      } else {
        this.tower.maxHp = this.getMaxHp();
      }
    }

    // 敵の生成タイミング管理
    this.spawnTimer += deltaTime;
    const maxEnemies = 5 + this.wave * 2;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.length < maxEnemies) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // 敵の移動と行動
    this.enemies.forEach((enemy) => {
      // 遠距離部隊の処理
      if (enemy.type === 'ranged' && !enemy.stopped) {
        const distanceToTower = this.getDistance(enemy.x, enemy.y, this.tower.x, this.tower.y);
        // 射程ギリギリ内側で停止
        if (distanceToTower <= this.tower.range * 0.95) {
          enemy.stopped = true;
        }
      }

      // レイのチャージ処理
      if (enemy.type === 'ray' && !enemy.charging) {
        const distanceToTower = this.getDistance(enemy.x, enemy.y, this.tower.x, this.tower.y);
        // 攻撃範囲の線上で停止
        if (distanceToTower <= this.tower.range * 1.1 && distanceToTower >= this.tower.range * 0.9) {
          enemy.charging = true;
          enemy.chargeTime = 0;
        }
      }

      if (enemy.type === 'ray' && enemy.charging) {
        enemy.chargeTime += deltaTime;
        if (enemy.chargeTime >= enemy.chargeDuration) {
          // チャージ完了、光線発射
          this.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            targetX: this.tower.x,
            targetY: this.tower.y,
            speed: 2,
            damage: this.tower.damage * 2, // 2倍ダメージ
            isRay: true,
            ownerType: 'ray'
          });
          enemy.charging = false;
          enemy.chargeTime = 0;
        }
      }

      // 遠距離部隊の攻撃
      if (enemy.type === 'ranged' && enemy.stopped) {
        enemy.attackCooldown -= deltaTime;
        if (enemy.attackCooldown <= 0) {
          // 弾を発射
          this.projectiles.push({
            x: enemy.x,
            y: enemy.y,
            targetX: this.tower.x,
            targetY: this.tower.y,
            speed: 1,
            damage: 5,
            isRay: false,
            ownerType: 'ranged'
          });
          enemy.attackCooldown = enemy.attackInterval;
        }
      }

      // 吸血鬼の吸血攻撃
      if (enemy.type === 'vampire') {
        enemy.vampireCooldown -= deltaTime;
        if (enemy.vampireCooldown <= 0) {
          const distanceToTower = this.getDistance(enemy.x, enemy.y, this.tower.x, this.tower.y);
          if (distanceToTower <= this.towerRadius * 2) {
            // 割合ダメージ攻撃（タワーHPの5%）
            const damage = Math.max(1, Math.floor(this.tower.hp * 0.05));
            this.tower.hp -= damage;
            // 自身のHPを回復（ダメージの半分）
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.floor(damage * 0.5));
          }
          enemy.vampireCooldown = enemy.vampireInterval;
        }
      }

      // 停止していない場合のみ移動
      if (!enemy.stopped && !(enemy.type === 'ray' && enemy.charging)) {
        // タワー（中心）への方向ベクトルを計算
        const dx = this.tower.x - enemy.x;
        const dy = this.tower.y - enemy.y;
        const distance = this.getDistance(enemy.x, enemy.y, this.tower.x, this.tower.y);

        if (distance > 0) {
          // 正規化された方向ベクトル
          const normalizedX = dx / distance;
          const normalizedY = dy / distance;

          // 速度に応じて移動
          enemy.x += normalizedX * enemy.speed;
          enemy.y += normalizedY * enemy.speed;
        }
      }

      // タワーに到達した場合（タワーの半径以内）
      const distanceToTower = this.getDistance(enemy.x, enemy.y, this.tower.x, this.tower.y);
      if (distanceToTower <= this.towerRadius) {
        // タワーにダメージ（敵の種類によって異なる） + 防御適用
        let damage = 10;
        if (enemy.type === 'boss') damage = 30;
        else if (enemy.type === 'tank') damage = 15;
        // ブロック判定
        if (Math.random() < this.getBlockChance()) {
          damage = Math.max(0, damage - this.getAbsoluteDefense());
        }
        this.tower.hp -= damage;
        if (this.tower.hp < 0) {
          this.tower.hp = 0;
        }
        if (this.tower.hp <= 0) {
          this.lastKiller = enemy.type;
          this.lastWave = this.wave;
          this.bestWave = Math.max(this.bestWave, this.lastWave);
        }

        // とげダメージ（接触時）
        const th = this.getThornsDamage();
        if (th > 0) {
          enemy.hp -= th;
        }

        // 敵を削除（HP尽きた場合）
        if (enemy.hp <= 0) {
          this.cash += 1;
          const addCoin = this.getCoinDropForType(enemy.type);
          this.coin += addCoin;
          this.coinRun += addCoin;
          if (enemy.type === 'protector') this.protectorCount--;
          this.removeEnemy(enemy.id);
        } else {
          // 通常は接触時点で削除（突撃）
          this.removeEnemy(enemy.id);
        }
        
      }
    });

    // タワーの自動攻撃
    // 攻撃間隔はアップグレードを反映
    const interval = this.getAttackInterval();
    if (currentTime - this.tower.lastAttackTime >= interval) {
      this.performTowerAttack();
      this.tower.lastAttackTime = currentTime;
    }

    // カウンターの更新
    this.bossCount = this.enemies.filter(e => e.type === 'boss').length;
    this.protectorCount = this.enemies.filter(e => e.type === 'protector').length;
    this.eliteCount = this.enemies.filter(e => e.isElite).length;

    // ウェーブ終了条件をチェック
    if (this.enemies.length === 0 && this.isWaveActive && !this.isWavePaused) {
      this.isWavePaused = true;
      this.isWaveActive = false;
    }

    // ゲームオーバーチェック
    if (this.tower.hp <= 0) {
      this.isWaveActive = false;
      this.isWavePaused = false;
    }
  }

  /**
   * タワーの自動攻撃処理（360度対応）
   */
  performTowerAttack() {
    if (this.enemies.length === 0) {
      return;
    }

    // 射程内の敵を取得（エリート敵は無視 - 今後武器システムで実装）
    const enemiesInRange = this.enemies.filter((enemy) => {
      if (enemy.isElite) {
        return false; // エリート敵はオーブ等の影響を受けない
      }
      const distance = this.getDistance(
        this.tower.x, this.tower.y,
        enemy.x, enemy.y
      );
      return distance <= this.tower.range;
    });

    if (enemiesInRange.length === 0) {
      return;
    }

    // 最もタワーに近い敵順に並べる
    const sorted = enemiesInRange.slice().sort((a, b) => {
      const closestDist = this.getDistance(
        this.tower.x, this.tower.y,
        a.x, a.y
      );
      const enemyDist = this.getDistance(
        this.tower.x, this.tower.y,
        b.x, b.y
      );
      return closestDist - enemyDist;
    });

    // マルチショット本数決定
    let shots = 1;
    if (Math.random() < this.getMultishotChance()) {
      shots = Math.min(this.getMultishotCount(), sorted.length);
    }

    const critChance = this.getCritChance();
    const critMult = this.getCritMultiplier();

    for (let i = 0; i < shots; i++) {
      const target = sorted[i];
      if (!target) break;
      // レーザー
      this.attackEffects.push({
        startTime: Date.now(),
        fromX: this.tower.x,
        fromY: this.tower.y,
        toX: target.x,
        toY: target.y
      });

      // ダメージ計算
      const distance = this.getDistance(this.tower.x, this.tower.y, target.x, target.y);
      let dmg = this.getDamage();
      // クリティカル
      if (Math.random() < critChance) {
        dmg *= critMult;
      }
      // 距離補正
      dmg *= this.getDamagePerMeterMultiplier(distance);

      // バリア（即死無効相当。現状通常ダメージのみなのでそのまま）
      const dealt = Math.max(1, Math.floor(dmg));
      target.hp -= dealt;

      // ライフスティール（与ダメージの一部を回復）
      const ls = this.getLifestealPercent();
      if (ls > 0) {
        const heal = Math.max(0, Math.floor(dealt * ls));
        this.tower.hp = Math.min(this.getMaxHp(), this.tower.hp + heal);
      }

      // ノックバック
      if (Math.random() < this.getKnockbackChance()) {
        let power = this.getKnockbackPower();
        if (target.knockbackImmune) power = 0;
        else if (target.knockbackResist) power *= 0.3;
        if (power > 0) {
          const dx = target.x - this.tower.x;
          const dy = target.y - this.tower.y;
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          target.x += (dx/len) * power;
          target.y += (dy/len) * power;
        }
      }

      if (target.hp <= 0) {
        if (target.type === 'scatter' && target.splitCount < target.maxSplits) {
          this.splitEnemy(target);
        }
        this.cash += 1;
        const addCoin2 = this.getCoinDropForType(target.type);
        this.coin += addCoin2;
        this.coinRun += addCoin2;
        if (target.type === 'protector') this.protectorCount--;
        this.removeEnemy(target.id);
      }
    }
  }

  /**
   * Cursor+スキル（アクティブスキル）を発動
   * @param {number} targetId 攻撃対象の敵のID
   */
  cursorAttack(targetId) {
    if (!this.cursorAttackAvailable || !this.isWaveActive) {
      return;
    }

    const enemy = this.enemies.find((e) => e.id === targetId);
    if (!enemy) {
      return;
    }

    // レーザーエフェクトを追加
    this.attackEffects.push({
      startTime: Date.now(),
      fromX: this.tower.x,
      fromY: this.tower.y,
      toX: enemy.x,
      toY: enemy.y,
      isCursorAttack: true
    });

    // 10倍のダメージを与える（エリート敵にも効果あり）
    const cursorDamage = this.tower.damage * 10;
    enemy.hp -= cursorDamage;
    // ライフスティール
    const ls2 = this.getLifestealPercent();
    if (ls2 > 0) {
      const heal = Math.max(0, Math.floor(cursorDamage * ls2));
      this.tower.hp = Math.min(this.getMaxHp(), this.tower.hp + heal);
    }

    // 敵が倒れた場合
    if (enemy.hp <= 0) {
      if (enemy.type === 'scatter' && enemy.splitCount < enemy.maxSplits) {
        this.splitEnemy(enemy);
      }
      
      // 通貨ドロップ
      this.cash += 1;
      const addCoin3 = this.getCoinDropForType(enemy.type);
      this.coin += addCoin3;
      this.coinRun += addCoin3;
      
      if (enemy.type === 'protector') {
        this.protectorCount--;
      }
      
      this.removeEnemy(enemy.id);
    }

    // Cursor+スキルは1ウェーブに1回のみ使用可能
    this.cursorAttackAvailable = false;
  }

  /**
   * 敵を削除
   * @param {number} enemyId 削除する敵のID
   */
  removeEnemy(enemyId) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (enemy) {
      if (enemy.type === 'boss' && this.bossCount > 0) {
        this.bossCount--;
      }
      if (enemy.type === 'protector' && this.protectorCount > 0) {
        this.protectorCount--;
      }
      if (enemy.isElite && this.eliteCount > 0) {
        this.eliteCount--;
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.id !== enemyId);
  }

  /**
   * 現在のゲーム状態を取得
   * @returns {Object} ゲーム状態
   */
  getGameState() {
    return {
      tower: {
        x: this.tower.x,
        y: this.tower.y,
        hp: this.tower.hp,
        maxHp: this.tower.maxHp,
        damage: this.tower.damage,
        range: this.tower.range
      },
      cash: this.cash,
      coin: this.coin,
      gem: this.gem,
      wave: this.wave,
      meta: { ...this.meta },
      metaCosts: {
        damage: this.getMetaCost('damage'),
        health: this.getMetaCost('health'),
        range: this.getMetaCost('range'),
        critChance: this.getMetaCost('critChance')
      },
      upgrades: { ...this.upgrades },
      upgradeCosts: {
        damage: this.getUpgradeCost('damage'),
        attackSpeed: this.getUpgradeCost('attackSpeed'),
        critChance: this.getUpgradeCost('critChance'),
        critDamage: this.getUpgradeCost('critDamage'),
        range: this.getUpgradeCost('range'),
        damagePerMeter: this.getUpgradeCost('damagePerMeter'),
        multishotChance: this.getUpgradeCost('multishotChance'),
        multishotCount: this.getUpgradeCost('multishotCount'),
        health: this.getUpgradeCost('health'),
        healthRegen: this.getUpgradeCost('healthRegen'),
        defenseChance: this.getUpgradeCost('defenseChance'),
        absoluteDefense: this.getUpgradeCost('absoluteDefense'),
        thorns: this.getUpgradeCost('thorns'),
        lifesteal: this.getUpgradeCost('lifesteal'),
        knockbackChance: this.getUpgradeCost('knockbackChance'),
        knockbackPower: this.getUpgradeCost('knockbackPower')
      },
      enemies: this.enemies.map((enemy) => ({
        id: enemy.id,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        hp: Math.round(enemy.hp),
        maxHp: enemy.maxHp,
        type: enemy.type,
        size: enemy.size,
        stopped: enemy.stopped || false,
        charging: enemy.charging || false,
        chargeTime: enemy.chargeTime || 0,
        chargeDuration: enemy.chargeDuration || 0,
        hasBarrier: enemy.hasBarrier || false,
        isElite: enemy.isElite || false
      })),
      attackEffects: this.attackEffects.map((effect) => ({
        fromX: effect.fromX,
        fromY: effect.fromY,
        toX: effect.toX,
        toY: effect.toY,
        isCursorAttack: effect.isCursorAttack || false,
        startTime: effect.startTime
      })),
      projectiles: this.projectiles.map((proj) => ({
        x: Math.round(proj.x),
        y: Math.round(proj.y),
        targetX: proj.targetX,
        targetY: proj.targetY,
        isRay: proj.isRay || false
      })),
      stats: {
        lastWave: this.lastWave,
        bestWave: this.bestWave,
        lastKiller: this.lastKiller,
        coinRun: this.lastCoinRun || this.coinRun // ゲームオーバー時は前回の値を表示
      },
      isWaveActive: this.isWaveActive,
      isWavePaused: this.isWavePaused,
      cursorAttackAvailable: this.cursorAttackAvailable,
      gameOver: this.tower.hp <= 0
    };
  }

  /** 永続化用に必要な状態を取り出す */
  getPersistentState() {
    return {
      coin: this.coin,
      gem: this.gem,
      meta: this.meta,
      bestWave: this.bestWave
    };
  }

  /** 永続化データを読み込み反映 */
  loadPersistentState(data) {
    if (!data || typeof data !== 'object') return;
    if (typeof data.coin === 'number') this.coin = data.coin;
    if (typeof data.gem === 'number') this.gem = data.gem;
    if (data.meta && typeof data.meta === 'object') {
      this.meta = { ...this.meta, ...data.meta };
    }
    if (typeof data.bestWave === 'number') this.bestWave = data.bestWave;
    // 射程などメタ反映
    this.tower.range = 300 + (this.meta?.range || 0) * 10 + this.upgrades.range * 20;
    this.tower.maxHp = this.getMaxHp();
    this.tower.hp = Math.min(this.tower.maxHp, this.tower.hp);
  }
}

module.exports = GameLogic;
