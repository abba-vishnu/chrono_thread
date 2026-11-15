(function (CG) {
  const cfg = CG.GAME_CONFIG;
  const st = CG.state;
  const dom = CG.dom;

  CG.resize = function () {
    const stageRect = dom.gameStage.getBoundingClientRect();
    let w = stageRect.width;
    let h = stageRect.height;
    if (!w || !h) {
      h = window.innerHeight;
      w = Math.min(window.innerWidth, h * (9 / 16));
    }
    st.width = dom.canvas.width = Math.round(w);
    st.height = dom.canvas.height = Math.round(h);
    if (st.player) {
      st.player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
      const unmergedEchoX = st.player.leadX - cfg.TETHER_HORIZONTAL_GAP;
      st.player.echoX = unmergedEchoX + (st.player.leadX - unmergedEchoX) * (st.surgeMerge || 0);
    }
  };

  CG.updateUI = function () {
    dom.scoreEl.textContent = st.obstaclesPassed;

    const effectiveChain = CG.getEffectiveChain();
    dom.comboEl.classList.remove('boosted', 'maxed');
    if (st.doubleChainFrames > 0) {
      const secsLeft = Math.ceil(st.doubleChainFrames / 60);
      dom.comboEl.textContent = `SYNC x${effectiveChain} (2X ${secsLeft}s)`;
      dom.comboEl.classList.add(CG.isFullCombo() ? 'maxed' : 'boosted');
      dom.comboEl.style.transform = 'scale(1.08)';
    } else if (st.combo > 1) {
      dom.comboEl.textContent = CG.isFullCombo() ? `MAX SYNC x${st.combo}` : `SYNC x${st.combo}`;
      if (CG.isFullCombo()) dom.comboEl.classList.add('maxed');
      dom.comboEl.style.transform = 'scale(1.04)';
    } else {
      dom.comboEl.textContent = '';
      dom.comboEl.style.transform = 'scale(1)';
    }

    const playerColor = CG.getPlayerColor();
    const isAllFull = st.lives >= cfg.MAX_LIVES;
    const activeThreshold = Math.max(1, isAllFull ? cfg.MAX_LIFE_BONUS_BAR_MAX : cfg.LIFE_BAR_MAX);
    const fillPercent = Math.min(100, Math.max(0, (st.replenishBarPoints / activeThreshold) * 100));

    dom.livesEl.innerHTML = '';
    for (let i = 0; i < cfg.MAX_LIVES; i++) {
      const node = document.createElement('div');
      let cls = 'life-node';

      const fillWrap = document.createElement('div');
      fillWrap.className = 'life-node-fill';
      const fillInner = document.createElement('div');
      fillInner.className = 'life-node-fill-inner';

      if (isAllFull) {
        cls += ' active';
        node.style.setProperty('--player-color', playerColor);
        node.style.setProperty('--player-glow', playerColor);

        if (st.isMaxLifeExcited) {
          cls += ' excited';
          fillInner.style.setProperty('--fill-pct', '100%');
        } else if (st.replenishBarPoints > 0) {
          cls += ' overflow-gold';
          fillInner.style.setProperty('--fill-pct', `${fillPercent}%`);
        } else {
          fillInner.style.setProperty('--fill-pct', '100%');
          fillInner.style.setProperty('--fill-color', playerColor);
        }
      } else if (i < st.lives) {
        cls += ' active';
        node.style.setProperty('--player-color', playerColor);
        node.style.setProperty('--player-glow', playerColor);
        fillInner.style.setProperty('--fill-pct', '100%');
        fillInner.style.setProperty('--fill-color', playerColor);
      } else if (i === st.lives) {
        fillInner.style.setProperty('--fill-pct', `${fillPercent}%`);
        fillInner.style.setProperty('--fill-color', playerColor);
        if (i === st.damagedLifeIndex && st.damagedLifeTimer > 0) {
          cls += ' damaged';
        }
      } else {
        fillInner.style.setProperty('--fill-pct', '0%');
        if (i === st.damagedLifeIndex && st.damagedLifeTimer > 0) {
          cls += ' damaged';
        }
      }

      node.className = cls;
      fillWrap.appendChild(fillInner);
      node.appendChild(fillWrap);
      dom.livesEl.appendChild(node);
    }
  };

  CG.resetGame = function () {
    if (dom.gameoverOverlay) {
      dom.gameoverOverlay.classList.add('hidden');
      dom.gameoverOverlay.setAttribute('aria-hidden', 'true');
    }

    st.obstaclesPassed = 0;
    st.chainScore = 0;
    st.combo = 1;
    st.doubleChainFrames = 0;
    st.lives = Math.min(cfg.INITIAL_LIVES, cfg.MAX_LIVES);
    st.replenishBarPoints = 0;
    st.isMaxLifeExcited = false;
    st.echoStamina = cfg.STAMINA_MAX;
    st.staminaLockoutFrames = 0;
    st.surgeMerge = 0;
    st.damageFlashFrames = 0;
    st.hitStopFrames = 0;
    st.damagedLifeIndex = -1;
    st.damagedLifeTimer = 0;
    st.activePhaseShield = null;
    CG.scheduleNextDiamond();
    st.speed = cfg.BASE_SPEED;
    if (st.isPaused) CG.setPaused(false);
    CG.clearAllInputs();
    dom.tierBannerEl.classList.remove('visible');
    st.frame = 0;
    st.spawnCooldown = 0;
    st.shakeTime = 0;
    st.highestStageAnnounced = 1;
    st.bannerTimer = 0;
    st.seenStageKeys.clear();
    st.recentSpawnHistory = [];
    dom.tierBannerEl.textContent = '';
    st.obstacles = [];
    st.particles = [];
    st.telegraphs = [];
    st.floatingTexts = [];

    const player = st.player;
    player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
    player.y = st.height / 2;
    player.vy = 0;
    player.radius = cfg.PARENT_RADIUS;
    player.echoX = player.leadX - cfg.TETHER_HORIZONTAL_GAP;
    player.echoY = st.height / 2;
    player.unmergedEchoY = st.height / 2;
    player.radiusEcho = cfg.ECHO_RADIUS;
    player.history = Array(cfg.ECHO_DELAY_FRAMES + 1).fill(st.height / 2);
    player.leadTrail = [];
    st.previousEcho = { x: player.echoX, y: player.echoY };
    st.gameOver = false;
    CG.updateUI();
  };

  function loop() {
    CG.updatePhysics();
    CG.draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', CG.resize);
  CG.resize();
  CG.buildTuningUI();
  CG.bindInspectorEvents();
  CG.bindInputs();
  CG.resetGame();
  loop();
})(window.ChronoGame);
