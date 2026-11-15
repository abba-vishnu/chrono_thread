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

    // Diegetic In-World Sync Multiplier (visible only from 2x upward, formatted as "2x"..."10x"..."20x")
    const effectiveChain = CG.getEffectiveChain();
    dom.comboEl.classList.remove('visible', 'tier-mid', 'tier-high', 'maxed');
    if (effectiveChain >= 2) {
      dom.comboEl.textContent = `${effectiveChain}x`;
      dom.comboEl.classList.add('visible');
      if (CG.isFullCombo()) {
        dom.comboEl.classList.add('maxed');
      } else if (effectiveChain >= 5) {
        dom.comboEl.classList.add('tier-high');
      } else {
        dom.comboEl.classList.add('tier-mid');
      }
    } else {
      dom.comboEl.textContent = '';
      dom.comboEl.style.transform = 'translate3d(0px, 0px, 0) scale(0.85)';
    }

    // Lives Diamonds: decoupled from combo colors; displays white health + internal yellow overcharge bar
    const isAllFull = st.lives >= cfg.MAX_LIVES;
    const overchargeMax = Math.max(1, cfg.MAX_LIFE_BONUS_BAR_MAX);
    const overchargePercent = st.isMaxLifeExcited
      ? 100
      : Math.min(100, Math.max(0, (st.replenishBarPoints / overchargeMax) * 100));
    const healthFillPercent = Math.min(100, Math.max(0, (st.replenishBarPoints / Math.max(1, cfg.LIFE_BAR_MAX)) * 100));

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
        fillInner.style.setProperty('--fill-pct', '100%');

        if (st.isMaxLifeExcited) {
          cls += ' excited';
        } else if (st.replenishBarPoints > 0) {
          cls += ' overcharging';
        }
        if (st.diamondPopFrames > 0) {
          cls += ' overcharge-pop';
        }

        // Second internal bottom-to-top yellow overcharge bar inside each full health diamond
        const overWrap = document.createElement('div');
        overWrap.className = 'life-node-overcharge-fill';
        const overInner = document.createElement('div');
        overInner.className = 'life-node-overcharge-inner';
        overInner.style.setProperty('--overcharge-pct', `${overchargePercent}%`);
        overInner.style.setProperty('--overcharge-edge-opacity', (overchargePercent > 0 && overchargePercent < 100) ? '0.9' : '0');
        overWrap.appendChild(overInner);
        node.appendChild(overWrap);
      } else if (i < st.lives) {
        cls += ' active';
        fillInner.style.setProperty('--fill-pct', '100%');
      } else if (i === st.lives) {
        fillInner.style.setProperty('--fill-pct', `${healthFillPercent}%`);
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
    st.speedProgressWalls = 0;
    st.chainScore = 0;
    st.combo = 1;
    st.comboPopFrames = 0;
    st.doubleChainFrames = 0;
    st.lives = Math.min(cfg.INITIAL_LIVES, cfg.MAX_LIVES);
    st.replenishBarPoints = 0;
    st.isMaxLifeExcited = false;
    st.diamondPopFrames = 0;
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
    if (st.isPaused && typeof CG.setPaused === 'function') {
      CG.setPaused(false);
    } else {
      st.isPaused = false;
    }
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
  CG.bindInputs();
  CG.resetGame();
  loop();
})(window.ChronoGame);
