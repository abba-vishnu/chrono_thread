(function (CG) {
  const cfg = CG.GAME_CONFIG;
  const st = CG.state;

  const OSC_MULT_MAP = {
    pink_wall: { speedMult: 'PINK_WALL_OSC_SPEED_MULT', ampMult: 'PINK_WALL_OSC_AMP_MULT' },
    node: { speedMult: 'GATE_NODE_OSC_SPEED_MULT', ampMult: 'GATE_NODE_OSC_AMP_MULT' },
    mail_slot: { speedMult: 'MAIL_SLOT_OSC_SPEED_MULT', ampMult: 'MAIL_SLOT_OSC_AMP_MULT' },
    double_slit: { speedMult: 'DOUBLE_SLIT_OSC_SPEED_MULT', ampMult: 'DOUBLE_SLIT_OSC_AMP_MULT' },
    dual_target_gate: { speedMult: 'DUAL_RECT_OSC_SPEED_MULT', ampMult: 'DUAL_RECT_OSC_AMP_MULT' },
    staggered_step: { speedMult: 'STAGGERED_OSC_SPEED_MULT', ampMult: 'STAGGERED_OSC_AMP_MULT' },
    trail_missile: { speedMult: 'MISSILE_OSC_SPEED_MULT', ampMult: 'MISSILE_OSC_AMP_MULT' },
    echo_pad_gate: { speedMult: 'ECHO_PAD_OSC_SPEED_MULT', ampMult: 'ECHO_PAD_OSC_AMP_MULT' }
  };

  function getOscParams(obs) {
    const entry = OSC_MULT_MAP[obs.kind];
    const parentSpeed = cfg.GLOBAL_OSC_SPEED ?? 0.75;
    const parentAmp = cfg.GLOBAL_OSC_AMP ?? 68;
    const sMult = (entry && cfg[entry.speedMult] !== undefined) ? cfg[entry.speedMult] : 1.0;
    const aMult = (entry && cfg[entry.ampMult] !== undefined) ? cfg[entry.ampMult] : 1.0;
    return {
      speed: parentSpeed * sMult * (obs.oscSpeedScale ?? 1.0),
      amp: parentAmp * aMult * (obs.oscAmpScale ?? 1.0)
    };
  }

  function getRosterHex(colorKey) {
    if (colorKey === 'cyan') return cfg.COLORS.ROSTER_CYAN;
    if (colorKey === 'amber') return cfg.COLORS.ROSTER_AMBER;
    return cfg.COLORS.ROSTER_PINK;
  }

  CG.circleRectCollide = function (cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  };

  CG.segmentCircleHit = function (x1, y1, x2, y2, cx, cy, cr) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(cx - x1, cy - y1) <= cr;
    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;
    const distSq = (cx - nearX) ** 2 + (cy - nearY) ** 2;
    return distSq <= cr * cr;
  };

  CG.segmentRectHit = function (x1, y1, x2, y2, rx, ry, rw, rh) {
    if (rw <= 0 || rh <= 0) return false;
    const minX = rx;
    const maxX = rx + rw;
    const minY = ry;
    const maxY = ry + rh;

    if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
    if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

    const dx = x2 - x1;
    const dy = y2 - y1;
    let t0 = 0;
    let t1 = 1;

    const checks = [
      [-dx, x1 - minX],
      [dx, maxX - x1],
      [-dy, y1 - minY],
      [dy, maxY - y1]
    ];

    for (let i = 0; i < 4; i++) {
      const p = checks[i][0];
      const q = checks[i][1];
      if (p === 0) {
        if (q < 0) return false;
      } else {
        const r = q / p;
        if (p < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
      }
    }
    return t0 <= t1;
  };

  CG.checkUniversalTouchWithRect = function (rx, ry, rw, rh) {
    if (rw <= 0 || rh <= 0) return false;
    const p = st.player;
    if (CG.circleRectCollide(p.leadX, p.y, p.radius, rx, ry, rw, rh)) return true;
    if (st.surgeMerge < 0.96) {
      const effectiveEchoR = p.radiusEcho * (1 - st.surgeMerge * 0.85);
      if (CG.circleRectCollide(p.echoX, p.echoY, effectiveEchoR, rx, ry, rw, rh)) return true;
      if (CG.segmentRectHit(p.echoX, p.echoY, p.leadX, p.y, rx, ry, rw, rh)) return true;
    }
    return false;
  };

  CG.checkUniversalTouchWithCircle = function (cx, cy, cr, extraPadding = 0) {
    const p = st.player;
    if (Math.hypot(p.leadX - cx, p.y - cy) <= (p.radius + cr + extraPadding)) return true;
    if (st.surgeMerge < 0.96) {
      const effectiveEchoR = p.radiusEcho * (1 - st.surgeMerge * 0.85);
      if (Math.hypot(p.echoX - cx, p.echoY - cy) <= (effectiveEchoR + cr + extraPadding)) return true;
      if (CG.segmentCircleHit(p.echoX, p.echoY, p.leadX, p.y, cx, cy, cr + extraPadding)) return true;
    }
    return false;
  };

  CG.getEffectiveChain = function () {
    let chain = st.combo;
    if (st.isMaxLifeExcited) {
      chain *= (cfg.MAX_LIFE_BAR_BONUS ?? 1);
    }
    if (st.doubleChainFrames > 0) {
      chain *= 2;
    }
    return chain;
  };

  CG.isFullCombo = function () {
    return st.combo >= cfg.MAX_COMBO;
  };

  CG.isPlayerOvercharged = function () {
    return Boolean(st.isMaxLifeExcited);
  };

  CG.getPlayerColor = function () {
    return CG.isPlayerOvercharged()
      ? (cfg.PLAYER_OVERCHARGE_COLOR || cfg.COLORS.VILLAIN_AMBER)
      : cfg.PLAYER_DEFAULT_COLOR;
  };

  CG.incrementObstaclesPassed = function () {
    st.obstaclesPassed++;
    st.speedProgressWalls++;
    const earnedPoints = cfg.POINTS_PER_OBSTACLE * CG.getEffectiveChain();
    st.chainScore += earnedPoints;
    CG.addFloatingText(
      st.player.leadX + 14,
      st.player.y - 22,
      `+${earnedPoints}`,
      st.doubleChainFrames > 0 ? cfg.COLORS.FEEDBACK_BOOST : cfg.COLORS.FEEDBACK_POSITIVE,
      true
    );

    if (st.showDebugText) {
      CG.checkTierAnnouncement();
    }
    CG.updateUI();
  };

  CG.triggerGameOver = function () {
    st.gameOver = true;
    st.gameOverTimestamp = performance.now();
    CG.clearAllInputs();

    const isNewRecord = st.obstaclesPassed > st.bestWallsCleared && st.obstaclesPassed > 0;
    if (st.obstaclesPassed > st.bestWallsCleared) {
      st.bestWallsCleared = st.obstaclesPassed;
      try {
        localStorage.setItem(CG.BEST_WALLS_KEY, String(st.bestWallsCleared));
      } catch (_) {}
    }

    if (CG.dom.goWallsEl) CG.dom.goWallsEl.textContent = String(st.obstaclesPassed);
    if (CG.dom.goScoreEl) CG.dom.goScoreEl.textContent = String(st.chainScore);
    if (CG.dom.goBestWallsEl) CG.dom.goBestWallsEl.textContent = String(st.bestWallsCleared);
    if (CG.dom.goBestBadgeEl) {
      CG.dom.goBestBadgeEl.classList.toggle('hidden', !isNewRecord);
    }
    if (CG.dom.gameoverOverlay) {
      CG.dom.gameoverOverlay.classList.remove('hidden');
      CG.dom.gameoverOverlay.setAttribute('aria-hidden', 'false');
    }
  };

  CG.takeDamage = function (hitX = st.player.leadX, hitY = st.player.y) {
    const alertCol = cfg.COLORS.FEEDBACK_ALERT;
    st.shakeTime = 18;
    st.hitStopFrames = 3;
    st.damageFlashFrames = st.damageMaxFrames;
    CG.createBurst(hitX, hitY, alertCol, 28);
    if (st.surgeMerge < 0.7) {
      CG.createBurst(st.player.echoX, st.player.echoY, alertCol, 14);
    }

    // Reset speed back to BASE_SPEED on life lost and increment normally from there
    st.speedProgressWalls = 0;
    st.speed = cfg.BASE_SPEED;

    // Failure / Reset condition: clear combo, overcharge fill, and excited state
    st.combo = 1;
    st.comboPopFrames = 0;
    st.doubleChainFrames = 0;
    st.activePhaseShield = null;
    st.isMaxLifeExcited = false;
    st.replenishBarPoints = 0;

    if (st.godmodeEnabled) {
      st.lives--;
      st.damagedLifeIndex = Math.max(0, st.lives);
      st.damagedLifeTimer = 28;
      if (st.lives <= 0) {
        st.lives = cfg.MAX_LIVES;
        st.echoStamina = cfg.STAMINA_MAX;
        st.staminaLockoutFrames = 0;
        CG.addFloatingText(hitX, hitY - 26, 'GODMODE: THREAD RESTORED', cfg.COLORS.VILLAIN_AMBER);
      } else {
        CG.addFloatingText(hitX, hitY - 26, 'THREAD HIT (SPEED RESET)', alertCol);
      }
      CG.updateUI();
      return;
    }

    st.lives--;
    st.damagedLifeIndex = Math.max(0, st.lives);
    st.damagedLifeTimer = 28;
    CG.addFloatingText(hitX, hitY - 26, 'THREAD HIT (SPEED RESET)', alertCol);
    CG.updateUI();

    if (st.lives <= 0) {
      CG.triggerGameOver();
    }
  };

  CG.addReplenishBarPoints = function (amount, x, y) {
    const wasAllFull = st.lives >= cfg.MAX_LIVES;
    if (wasAllFull && amount > 0) {
      st.diamondPopFrames = 14;
    }

    if (!wasAllFull) {
      st.replenishBarPoints += amount;
      while (st.lives < cfg.MAX_LIVES) {
        const threshold = Math.max(1, cfg.LIFE_BAR_MAX);
        if (st.replenishBarPoints < threshold) break;
        st.replenishBarPoints -= threshold;
        st.lives++;
        CG.addFloatingText(x, y - 26, '+1 CORE LIFE', cfg.COLORS.FEEDBACK_BOOST);
      }
      // If a prism overflowed into full lives, carry remainder into the max-life overcharge bar
      if (st.lives >= cfg.MAX_LIVES && st.replenishBarPoints > 0) {
        const overchargeThreshold = Math.max(1, cfg.MAX_LIFE_BONUS_BAR_MAX);
        if (st.replenishBarPoints >= overchargeThreshold) {
          st.replenishBarPoints = overchargeThreshold;
          if (!st.isMaxLifeExcited) {
            st.isMaxLifeExcited = true;
            CG.addFloatingText(x, y - 26, `${cfg.MAX_LIFE_BAR_BONUS}X OVERCHARGE`, cfg.COLORS.VILLAIN_AMBER);
          }
        }
      }
    } else {
      const overchargeThreshold = Math.max(1, cfg.MAX_LIFE_BONUS_BAR_MAX);
      st.replenishBarPoints = Math.min(overchargeThreshold, st.replenishBarPoints + amount);
      if (st.replenishBarPoints >= overchargeThreshold && !st.isMaxLifeExcited) {
        st.isMaxLifeExcited = true;
        CG.addFloatingText(x, y - 26, `${cfg.MAX_LIFE_BAR_BONUS}X OVERCHARGE`, cfg.COLORS.VILLAIN_AMBER);
      }
    }
    CG.updateUI();
  };

  function computeOscillationOffset(obs, minBound, maxBound) {
    if (obs.motionState !== 'oscillating') return 0;
    const { speed, amp } = getOscParams(obs);
    obs.phase += 0.032 * speed;
    const rawOffset = Math.sin(obs.phase) * amp;
    const base = obs.spawnY;
    const clampedY = Math.max(minBound, Math.min(maxBound, base + rawOffset));
    return clampedY - base;
  }

  CG.updatePhysics = function () {
    if (st.isPaused) return;

    if (st.gameState === 'MENU') {
      st.frame++;
      // Gentle sine-wave idle hover loop for character on start screen
      const player = st.player;
      player.y = (st.height / 2) + Math.sin(st.frame * 0.05) * 12;
      player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
      const unmergedEchoX = player.leadX - cfg.TETHER_HORIZONTAL_GAP;
      player.echoX = unmergedEchoX;
      player.echoY = player.y + Math.cos(st.frame * 0.05) * 6;
      return;
    }

    if (st.gameOver) return;

    const player = st.player;
    const height = st.height;
    const cols = cfg.COLORS;

    if (st.damageFlashFrames > 0) st.damageFlashFrames--;
    if (st.diamondPopFrames > 0) st.diamondPopFrames--;
    if (st.comboPopFrames > 0) st.comboPopFrames--;
    if (st.damagedLifeTimer > 0) {
      st.damagedLifeTimer--;
      if (st.damagedLifeTimer === 0) {
        st.damagedLifeIndex = -1;
        CG.updateUI();
      }
    }

    if (st.hitStopFrames > 0) {
      st.hitStopFrames--;
      return;
    }

    st.frame++;
    if (st.spawnCooldown > 0) st.spawnCooldown--;
    if (st.shakeTime > 0) st.shakeTime--;
    if (st.bannerTimer > 0) {
      st.bannerTimer--;
      if (st.bannerTimer === 0) {
        CG.dom.tierBannerEl.classList.remove('visible');
        CG.dom.tierBannerEl.textContent = '';
      }
    }
    if (st.doubleChainFrames > 0) {
      st.doubleChainFrames--;
      if (st.doubleChainFrames === 0) {
        CG.updateUI();
      }
    }

    // Calculate baseline wall-scaled speed, then apply timed Prism dampener during 2X Overdrive
    const rawWallSpeed = Math.min(
      cfg.MAX_SPEED,
      cfg.BASE_SPEED + st.speedProgressWalls * cfg.SPEED_SCALING_FACTOR
    );
    const prismDampen = st.doubleChainFrames > 0 ? (cfg.PRISM_SPEED_DAMPEN_FACTOR ?? 0.78) : 1.0;
    st.speed = Math.max(cfg.BASE_SPEED * 0.75, rawWallSpeed * prismDampen);

    let effectiveGravityUp = cfg.GRAVITY_UP;
    let effectiveGravityDown = cfg.GRAVITY_DOWN;
    let isSurging = false;

    if (st.infiniteSurge) {
      st.echoStamina = cfg.STAMINA_MAX;
      st.staminaLockoutFrames = 0;
    }

    if (st.staminaLockoutFrames > 0) {
      st.staminaLockoutFrames--;
      if (st.staminaLockoutFrames === 0) {
        CG.addFloatingText(player.leadX, player.y - 22, 'SURGE READY', cols.FEEDBACK_BOOST);
      }
      CG.syncBoostButtonVisual();
    } else if (CG.isBoostRequested() && st.echoStamina > 0) {
      isSurging = true;
      effectiveGravityUp *= cfg.BOOST_GRAVITY_MULTIPLIER;
      effectiveGravityDown *= cfg.BOOST_GRAVITY_MULTIPLIER;
      st.echoStamina = Math.max(0, st.echoStamina - cfg.STAMINA_DRAIN_RATE);

      if (st.echoStamina <= 0) {
        isSurging = false;
        st.echoStamina = 0;
        st.staminaLockoutFrames = Math.max(1, Math.round(cfg.STAMINA_LOCKOUT_SECONDS * 60));
        st.shakeTime = 7;
        CG.createBurst(player.leadX, player.y, cols.FEEDBACK_ALERT, 16);
        CG.addFloatingText(player.leadX, player.y - 24, 'SURGE OVERHEATED!', cols.FEEDBACK_ALERT);
        CG.syncBoostButtonVisual();
      }
    } else {
      st.echoStamina = Math.min(cfg.STAMINA_MAX, st.echoStamina + cfg.STAMINA_RECOVERY_RATE);
    }

    const targetMerge = isSurging ? 1 : 0;
    const mergeRate = isSurging
      ? (cfg.SURGE_SNAP_IN_RATE ?? 0.24)
      : (cfg.SURGE_SNAP_OUT_RATE ?? 0.16);
    st.surgeMerge += (targetMerge - st.surgeMerge) * mergeRate;

    if (st.surgeMerge > 0.992) st.surgeMerge = 1;
    if (st.surgeMerge < 0.008) st.surgeMerge = 0;

    const parentRisingInput = CG.isHoldingPrimary();
    if (parentRisingInput) player.vy -= effectiveGravityUp;
    else player.vy += effectiveGravityDown;
    player.vy *= cfg.VELOCITY_DAMPING;
    player.y += player.vy;

    if (player.y < 20) { player.y = 20; player.vy = 0; }
    if (player.y > height - 20) { player.y = height - 20; player.vy = 0; }

    player.leadTrail.push({ x: player.leadX, y: player.y, vy: player.vy });
    if (player.leadTrail.length > 8) player.leadTrail.shift();

    player.history.push(player.y);
    while (player.history.length > cfg.ECHO_DELAY_FRAMES + 1) {
      player.history.shift();
    }
    const autoEchoY = player.history[0];

    player.unmergedEchoY += (autoEchoY - player.unmergedEchoY) * cfg.ECHO_RETURN_BLEND;
    const maxStretch = cfg.MAX_VERTICAL_STRETCH;
    player.unmergedEchoY = Math.max(
      Math.max(20, player.y - maxStretch),
      Math.min(Math.min(height - 20, player.y + maxStretch), player.unmergedEchoY)
    );

    const unmergedEchoX = player.leadX - cfg.TETHER_HORIZONTAL_GAP;
    st.previousEcho = { x: player.echoX, y: player.echoY };

    player.echoX = unmergedEchoX + (player.leadX - unmergedEchoX) * st.surgeMerge;
    player.echoY = player.unmergedEchoY + (player.y - player.unmergedEchoY) * st.surgeMerge;

    const leadY = player.y;
    const echoY = player.echoY;

    const spawnInterval = Math.max(
      cfg.MIN_SPAWN_INTERVAL,
      Math.floor(cfg.BASE_SPAWN_INTERVAL - st.obstaclesPassed * cfg.SPAWN_SCALING)
    );
    if (st.frame % spawnInterval === 0 && st.spawnCooldown <= 0) {
      CG.queuePattern(false);
    }

    if (typeof CG.maintainInterVillainOrbs === 'function') {
      CG.maintainInterVillainOrbs();
    }

    for (let i = st.telegraphs.length - 1; i >= 0; i--) {
      const tel = st.telegraphs[i];
      tel.timer--;
      if (tel.timer <= 0) {
        CG.spawnFromTelegraph(tel);
        st.telegraphs.splice(i, 1);
      }
    }

    for (let i = st.obstacles.length - 1; i >= 0; i--) {
      const obs = st.obstacles[i];

      if (obs.kind === 'trail_missile') {
        if (obs.state === 'locking') {
          obs.lockTimer--;
          if (obs.lockTimer > obs.maxLock * 0.35) {
            obs.y += (player.y - obs.y) * 0.14;
            obs.spawnY = obs.y;
          }
          if (obs.lockTimer <= 0) obs.state = 'flying';
        } else {
          obs.x -= cfg.MISSILE_SPEED;
          if (obs.motionState === 'oscillating') {
            const { speed, amp } = getOscParams(obs);
            obs.phase += 0.045 * speed;
            const clampedAmp = Math.min(amp, height * 0.35);
            obs.y = Math.max(36, Math.min(height - 36, obs.spawnY + Math.sin(obs.phase) * clampedAmp));
          }
          obs.trail.push({ x: obs.x + obs.r * 0.6, y: obs.y, life: 1 });
          if (obs.trail.length > 16) obs.trail.shift();
        }
        obs.trail.forEach(pt => { pt.life -= 0.07; });
      } else {
        obs.x -= st.speed;
        if (obs.targetX !== null && obs.targetX !== undefined) obs.targetX -= st.speed;
        if (obs.rearX !== undefined) obs.rearX -= st.speed;
        if (obs.echoRectX !== undefined) {
          obs.echoRectX -= st.speed;
          obs.leadRectX -= st.speed;
        }
        if (obs.gateX !== undefined) obs.gateX -= st.speed;
      }

      if (obs.kind === 'pink_wall' || obs.kind === 'mail_slot') {
        if (obs.motionState === 'oscillating') {
          const halfGap = obs.gapSize * 0.5;
          const dy = computeOscillationOffset(obs, halfGap + 28, height - halfGap - 28);
          const curCenter = obs.spawnY + dy;
          obs.gapTop = curCenter - halfGap;
          obs.gapBottom = curCenter + halfGap;
        }

        if (!st.disableVillains) {
          const hitTop = CG.checkUniversalTouchWithRect(obs.x, 0, obs.w, obs.gapTop);
          const hitBottom = CG.checkUniversalTouchWithRect(obs.x, obs.gapBottom, obs.w, height - obs.gapBottom);

          if (hitTop || hitBottom) {
            CG.takeDamage(player.leadX, leadY);
            st.obstacles.splice(i, 1);
            continue;
          }
        }

        if (!obs.passed && obs.x + obs.w < player.echoX) {
          obs.passed = true;
          CG.incrementObstaclesPassed();
        }

      } else if (obs.kind === 'double_slit') {
        if (obs.motionState === 'oscillating') {
          const halfSpan = obs.gapSize + obs.dividerH * 0.5;
          const dy = computeOscillationOffset(obs, halfSpan + 26, height - halfSpan - 26);
          const curCenter = obs.spawnY + dy;
          obs.dividerTop = curCenter - obs.dividerH * 0.5;
          obs.dividerBottom = curCenter + obs.dividerH * 0.5;
          obs.topGapTop = obs.dividerTop - obs.gapSize;
          obs.bottomGapBottom = obs.dividerBottom + obs.gapSize;
        }

        if (!st.disableVillains) {
          const hitTopWall = CG.checkUniversalTouchWithRect(obs.x, 0, obs.w, obs.topGapTop);
          const hitCenterDivider = CG.checkUniversalTouchWithRect(obs.x, obs.dividerTop, obs.w, obs.dividerH);
          const hitBottomWall = CG.checkUniversalTouchWithRect(obs.x, obs.bottomGapBottom, obs.w, height - obs.bottomGapBottom);

          if (hitTopWall || hitCenterDivider || hitBottomWall) {
            CG.takeDamage(player.leadX, leadY);
            st.obstacles.splice(i, 1);
            continue;
          }
        }

        if (!obs.passed && obs.x + obs.w < player.echoX) {
          obs.passed = true;
          CG.incrementObstaclesPassed();
        }

      } else if (obs.kind === 'staggered_step') {
        if (obs.motionState === 'oscillating') {
          const halfGap = obs.gapSize * 0.5;
          const minBound = halfGap + 30;
          const maxBound = height - halfGap - 30;
          const { speed, amp } = getOscParams(obs);

          obs.phase += 0.032 * speed;
          const phaseDelay = cfg.STAGGERED_PHASE_DELAY ?? 0;

          const frontY = Math.max(minBound, Math.min(maxBound, obs.frontBaseY + Math.sin(obs.phase) * amp));
          const rearY = Math.max(minBound, Math.min(maxBound, obs.rearBaseY + Math.sin(obs.phase - phaseDelay) * amp));

          obs.frontGapTop = frontY - halfGap;
          obs.frontGapBottom = frontY + halfGap;
          obs.rearGapTop = rearY - halfGap;
          obs.rearGapBottom = rearY + halfGap;
        }

        if (!st.disableVillains) {
          const hitFront = CG.checkUniversalTouchWithRect(obs.x, 0, obs.w, obs.frontGapTop) ||
                           CG.checkUniversalTouchWithRect(obs.x, obs.frontGapBottom, obs.w, height - obs.frontGapBottom);
          const hitRear = CG.checkUniversalTouchWithRect(obs.rearX, 0, obs.w, obs.rearGapTop) ||
                          CG.checkUniversalTouchWithRect(obs.rearX, obs.rearGapBottom, obs.w, height - obs.rearGapBottom);

          if (hitFront || hitRear) {
            CG.takeDamage(player.leadX, leadY);
            st.obstacles.splice(i, 1);
            continue;
          }
        }

        if (!obs.passed && obs.rearX + obs.w < player.echoX) {
          obs.passed = true;
          CG.incrementObstaclesPassed();
        }

      } else if (obs.kind === 'dual_target_gate') {
        if (obs.motionState === 'oscillating' && !obs.unlocked) {
          const halfSpan = Math.abs(obs.offset) + obs.h * 0.5 + 24;
          const dy = computeOscillationOffset(obs, halfSpan, height - halfSpan);
          obs.y = obs.spawnY + dy;
        }

        if (!obs.unlocked) {
          const echoYPos = obs.y - obs.offset;
          const leadYPos = obs.y + obs.offset;

          const echoKeyHit = CG.checkUniversalTouchWithRect(obs.echoRectX, echoYPos - obs.h / 2, obs.w, obs.h);
          const leadKeyHit = CG.checkUniversalTouchWithRect(obs.leadRectX, leadYPos - obs.h / 2, obs.w, obs.h);

          if (echoKeyHit && !obs.echoHit) {
            obs.echoHit = true;
            CG.createBurst(obs.echoRectX + obs.w / 2, echoYPos, cols.FEEDBACK_POSITIVE, 14);
            const startX = obs.echoRectX + obs.w;
            for (let tx = startX; tx <= obs.gateX; tx += 22) {
              CG.createBurst(tx, echoYPos, cols.VILLAIN_SECONDARY, 3);
            }
          }

          if (leadKeyHit && !obs.leadHit) {
            obs.leadHit = true;
            CG.createBurst(obs.leadRectX + obs.w / 2, leadYPos, cols.FEEDBACK_POSITIVE, 14);
            const startX = obs.leadRectX + obs.w;
            for (let tx = startX; tx <= obs.gateX; tx += 22) {
              CG.createBurst(tx, leadYPos, cols.VILLAIN_SECONDARY, 3);
            }
          }

          if (obs.echoHit && obs.leadHit) {
            obs.unlocked = true;
            st.shakeTime = 7;
            for (let y = 35; y < height; y += 42) {
              CG.createBurst(obs.gateX + obs.gateW / 2, y, cols.VILLAIN_SECONDARY, 5);
            }
            CG.addFloatingText((obs.echoRectX + obs.leadRectX) * 0.5, obs.y - 34, 'DUAL LOCK SYNCED!', cols.VILLAIN_SECONDARY);
          } else if (!st.disableVillains) {
            const hitGate = CG.checkUniversalTouchWithRect(obs.gateX, 0, obs.gateW, height);
            if (hitGate) {
              CG.takeDamage(player.leadX, leadY);
              obs.unlocked = true;
            }
          }
        }

        if (!obs.passed && obs.gateX + obs.gateW < player.echoX) {
          obs.passed = true;
          CG.incrementObstaclesPassed();
        }

      } else if (obs.kind === 'trail_missile') {
        if (obs.state === 'flying' && !st.disableVillains) {
          if (CG.checkUniversalTouchWithCircle(obs.x, obs.y, obs.r, 0)) {
            CG.createBurst(obs.x, obs.y, cols.VILLAIN_PRIMARY, 26);
            CG.takeDamage(obs.x, obs.y);
            st.obstacles.splice(i, 1);
            continue;
          }
        }

        if (!obs.passed && obs.x + obs.r < player.echoX) {
          obs.passed = true;
          CG.incrementObstaclesPassed();
        }

        if (obs.x < -60) {
          st.obstacles.splice(i, 1);
          continue;
        }

      } else if (obs.kind === 'echo_pad_gate') {
        if (obs.motionState === 'oscillating') {
          const halfCol = obs.columnHalfHeight + 24;
          const dy = computeOscillationOffset(obs, halfCol, height - halfCol);
          obs.currentCenterY = obs.spawnY + dy;
        } else {
          obs.currentCenterY = obs.spawnY;
        }

        for (let k = 0; k < obs.keys.length; k++) {
          const key = obs.keys[k];
          if (key.collected) continue;
          const keyY = obs.currentCenterY + key.offsetY;
          if (CG.checkUniversalTouchWithCircle(obs.x, keyY, obs.padR, 2)) {
            key.collected = true;
            st.activePhaseShield = key.color;
            const shieldHexColor = getRosterHex(key.color);
            CG.createBurst(obs.x, keyY, shieldHexColor, 20);
            const isMatch = key.color === obs.gateColor;
            CG.addFloatingText(
              obs.x,
              keyY - obs.padR - 10,
              isMatch ? `${key.color.toUpperCase()} ATTUNED!` : `${key.color.toUpperCase()} PHASE!`,
              shieldHexColor
            );
          }
        }

        const hitGate = CG.checkUniversalTouchWithRect(obs.gateX, 0, obs.gateW, height);
        if (hitGate) {
          if (st.activePhaseShield === obs.gateColor) {
            if (!obs.phasedThrough) {
              obs.phasedThrough = true;
              const matchHex = getRosterHex(obs.gateColor);
              CG.addFloatingText(obs.gateX + obs.gateW * 0.5, player.y - 26, 'PHASE PASS!', matchHex);
            }
          } else if (!st.disableVillains && !obs.damagedPlayer) {
            obs.damagedPlayer = true;
            CG.takeDamage(player.leadX, leadY);
          }
        }

        if (!obs.passed && obs.gateX + obs.gateW < player.echoX - player.radiusEcho) {
          obs.passed = true;
          if (obs.phasedThrough && st.activePhaseShield === obs.gateColor) {
            st.activePhaseShield = null;
          }
          CG.incrementObstaclesPassed();
        }

      } else if (obs.kind === 'locked_gate') {
        if (!obs.unlocked && !st.disableVillains) {
          const hitGate = CG.checkUniversalTouchWithRect(obs.x, 0, obs.w, height);
          if (hitGate) {
            CG.takeDamage(player.leadX, leadY);
            obs.unlocked = true;
          }
        } else if (!obs.passed && obs.x + obs.w < player.echoX) {
          obs.passed = true;
          CG.incrementObstaclesPassed();
        }

      } else if (obs.kind === 'special_diamond') {
        if (!obs.sliced) {
          if (CG.checkUniversalTouchWithCircle(obs.x, obs.y, obs.r, 5) ||
              CG.segmentCircleHit(st.previousEcho.x, st.previousEcho.y, player.echoX, echoY, obs.x, obs.y, obs.r + cfg.SWEEP_HARVEST_RADIUS)) {
            obs.sliced = true;
            CG.createBurst(obs.x, obs.y, cols.COLLECTIBLE_DIAMOND_OUTER, 26);
            CG.createBurst(obs.x, obs.y, cols.COLLECTIBLE_DIAMOND_INNER, 14);
            st.doubleChainFrames = Math.round(cfg.DIAMOND_DOUBLE_CHAIN_SECONDS * 60);
            st.comboPopFrames = 14;
            CG.addFloatingText(obs.x, obs.y - 14, `PRISM! 2X + SLOW +${cfg.DIAMOND_BAR_VALUE}`, cols.COLLECTIBLE_DIAMOND_OUTER);
            CG.addReplenishBarPoints(cfg.DIAMOND_BAR_VALUE, obs.x, obs.y);
          }
        }

      } else if (obs.kind === 'node') {
        if (obs.motionState === 'oscillating' && !obs.sliced) {
          const dy = computeOscillationOffset(obs, obs.r + 28, height - obs.r - 28);
          obs.y = obs.spawnY + dy;
        }

        if (!obs.sliced) {
          if (CG.checkUniversalTouchWithCircle(obs.x, obs.y, obs.r, 5) ||
              CG.segmentCircleHit(st.previousEcho.x, st.previousEcho.y, player.echoX, echoY, obs.x, obs.y, obs.r + cfg.SWEEP_HARVEST_RADIUS)) {
            obs.sliced = true;
            const isGateKey = obs.id !== null;
            CG.createBurst(obs.x, obs.y, isGateKey ? cols.VILLAIN_AMBER : cols.COLLECTIBLE_ORB, 18);

            if (isGateKey) {
              const gate = st.obstacles.find(o => o.kind === 'locked_gate' && o.id === obs.id);
              if (gate) {
                gate.unlocked = true;
                for (let y = 40; y < height; y += 45) {
                  CG.createBurst(gate.x + gate.w / 2, y, cols.VILLAIN_AMBER, 5);
                }
              }
            }

            const wasFull = CG.isFullCombo();
            const prevCombo = st.combo;
            st.combo = Math.min(cfg.MAX_COMBO, st.combo + 1);
            if (st.combo !== prevCombo) {
              st.comboPopFrames = 12;
            }
            if (!wasFull && CG.isFullCombo()) {
              st.comboPopFrames = 18;
              CG.addFloatingText(player.leadX, player.y - 36, 'MAX SYNC!', cols.VILLAIN_AMBER);
            }
            CG.addReplenishBarPoints(cfg.YELLOW_ORB_BAR_VALUE, obs.x, obs.y);
          } else if (obs.x + obs.r < player.echoX && !obs.missed) {
            obs.missed = true;
            if (st.combo > 1) {
              CG.addFloatingText(player.echoX, player.echoY - 16, 'SYNC LOST!', cols.FEEDBACK_ALERT);
            }
            st.combo = 1;
            st.comboPopFrames = 0;

            if (st.lives < cfg.MAX_LIVES) {
              // Regular life bar: only lose 1 point of progress
              st.replenishBarPoints = Math.max(0, st.replenishBarPoints - 1);
            } else {
              // Max-life overcharge bar: reset special counter and bonus completely
              st.replenishBarPoints = 0;
              st.isMaxLifeExcited = false;
            }
            CG.updateUI();
          }
        }
      }

      const rightmostX = obs.gateX ?? obs.rearX ?? obs.x;
      if (obs.kind !== 'trail_missile' && rightmostX < -140) {
        st.obstacles.splice(i, 1);
      }
    }

    for (let i = st.particles.length - 1; i >= 0; i--) {
      const p = st.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.035;
      if (p.life <= 0) st.particles.splice(i, 1);
    }

    for (let i = st.floatingTexts.length - 1; i >= 0; i--) {
      const ft = st.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.024;
      if (ft.life <= 0) st.floatingTexts.splice(i, 1);
    }
  };
})(window.ChronoGame);
