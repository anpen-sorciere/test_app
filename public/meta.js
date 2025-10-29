(function(){
  const state = {
    ws: null,
    gameState: null,
    bound: false,
  };

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.ws = new WebSocket(protocol + '//' + location.host);
    state.ws.onopen = () => {};
    state.ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (!m || !m.data) return;
        handleMessage(m);
      } catch {}
    };
    state.ws.onclose = () => { setTimeout(connect, 1500); };
  }

  function send(message) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(message));
    }
  }

  function handleMessage(message) {
    switch (message.type) {
      case 'INIT':
      case 'UPDATE':
        state.gameState = message.data;
        render();
        break;
    }
  }

  function render() {
    const s = state.gameState;
    if (!s) return;

    // ウォレット表示
    const wallet = document.getElementById('wallet');
    const coinEl = document.getElementById('meta-coin');
    const gemEl = document.getElementById('meta-gem');
    if (wallet) wallet.style.display = 'flex';
    if (coinEl) coinEl.textContent = String(s.coin ?? 0);
    if (gemEl) gemEl.textContent = String(s.gem ?? 0);

    // メタLv/コスト
    const meta = s.meta || {};
    const costs = s.metaCosts || {};
    const coin = s.coin ?? 0;
    const gem = s.gem ?? 0;

    const keys = ['damage','health','range','critChance'];
    keys.forEach((k) => {
      const level = meta[k] ?? 0;
      const cost = costs[k] || { coin: 0, gem: 0 };
      const lvEl = document.querySelector(`[data-lv="${k}"]`);
      if (lvEl) lvEl.textContent = String(level);
      const costCoinEl = document.querySelector(`[data-cost-coin="${k}"]`);
      if (costCoinEl) costCoinEl.textContent = String(cost.coin ?? 0);
      const costGemEl = document.querySelector(`[data-cost-gem="${k}"]`);
      if (costGemEl) costGemEl.textContent = String(cost.gem ?? 0);
      const btn = document.querySelector(`button[data-meta="${k}"]`);
      if (btn) {
        const affordable = (cost.coin ? coin >= cost.coin : true) && (cost.gem ? gem >= cost.gem : true);
        btn.disabled = !affordable;
      }
    });

    bind();
  }

  function bind() {
    if (state.bound) return;
    state.bound = true;
    document.querySelectorAll('button[data-meta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-meta');
        if (!type) return;
        send({ type: 'META_UPGRADE', metaType: type });
      });
    });
  }

  connect();
})();
