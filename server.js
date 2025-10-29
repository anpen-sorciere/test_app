const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const GameLogic = require('./gameLogic');
const fs = require('fs');

const SAVE_PATH = path.join(__dirname, 'save.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静的ファイルの配信（/ で index.html を自動提供しない）
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ルーティング: ホーム/プレイ/メタ
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});
app.get('/play', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/meta', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'meta.html'));
});
app.get('/cards', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cards.html'));
});
app.get('/lab', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lab.html'));
});
app.get('/store', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'store.html'));
});

// デバッグ: 永続化ファイルをリセット（開発用途）
app.post('/debug/reset-save', (_req, res) => {
  try {
    if (fs.existsSync(SAVE_PATH)) fs.unlinkSync(SAVE_PATH);
  } catch (e) {
    console.warn('削除に失敗:', e?.message);
  }
  // ランタイムの恒久データも初期化
  try {
    gameLogic.loadPersistentState({ coin: 0, gem: 0, meta: { damage: 0, health: 0, range: 0, critChance: 0 }, bestWave: 0 });
    safeSave();
  } catch (e) {
    console.warn('初期化に失敗:', e?.message);
  }
  res.json({ ok: true });
});

// ゲームロジックのインスタンス
const gameLogic = new GameLogic();
// 保存データ読み込み
try {
  if (fs.existsSync(SAVE_PATH)) {
    const raw = fs.readFileSync(SAVE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    gameLogic.loadPersistentState(data);
    console.log('永続化データを読み込みました');
  }
} catch (e) {
  console.warn('永続化データの読み込みに失敗:', e?.message);
}

// WebSocket接続の処理
wss.on('connection', (ws) => {
  console.log('新しいクライアントが接続しました');

  // 初期状態を送信
  const initialData = {
    type: 'INIT',
    data: gameLogic.getGameState()
  };
  ws.send(JSON.stringify(initialData));

  // クライアントからのメッセージ受信
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      
      switch (parsed.type) {
        case 'START_WAVE':
          gameLogic.startWave();
          break;
        case 'UPGRADE':
          if (parsed.upgradeType) {
            gameLogic.upgrade(parsed.upgradeType);
          }
          break;
        case 'META_UPGRADE':
          if (parsed.metaType && typeof gameLogic.buyMeta === 'function') {
            gameLogic.buyMeta(parsed.metaType);
            // 変更を保存
            safeSave();
          }
          break;
        case 'RETRY':
          gameLogic.resetGame();
          break;
        default:
          console.log('不明なメッセージタイプ:', parsed.type);
      }
    } catch (error) {
      console.error('メッセージのパースエラー:', error);
    }
  });

  ws.on('close', () => {
    console.log('クライアントが切断しました');
  });

  ws.on('error', (error) => {
    console.error('WebSocketエラー:', error);
  });
});

// ゲームループ（16ms = 約60FPS）
const GAME_LOOP_INTERVAL = 16;
let lastUpdate = Date.now();

setInterval(() => {
  const now = Date.now();
  const deltaTime = now - lastUpdate;
  lastUpdate = now;

  // ゲームロジックを更新
  gameLogic.update(deltaTime);

  // 接続されている全クライアントに更新データを送信
  const updateData = {
    type: 'UPDATE',
    data: gameLogic.getGameState()
  };

  const updateMessage = JSON.stringify(updateData);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(updateMessage);
    }
  });
}, GAME_LOOP_INTERVAL);

// 安全に保存する関数（軽いデバウンス）
let saveTimer = null;
function safeSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = gameLogic.getPersistentState();
      fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('保存に失敗:', e?.message);
    }
  }, 300);
}

// 定期保存（予防的）
setInterval(() => safeSave(), 10000);

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
  console.log(`ブラウザで http://localhost:${PORT} にアクセスしてください`);
});

